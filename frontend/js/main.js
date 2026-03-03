import * as MapModule from './map.js?v=8';

// ─── Config ─────────────────────────────────────────────────────────────────
const API = '/api';

// ─── State ───────────────────────────────────────────────────────────────────
let page       = 'dashboard';
let stations   = [];
let sysStats   = null;
let selected   = new Set();   // station IDs checked for research
let charts     = {};          // active Chart.js instances keyed by name
let timeMode   = 'range';     // 'range' | 'hours'

// ─── Format helpers ──────────────────────────────────────────────────────────
const fmt = {
  temp : v => v != null ? `${(+v).toFixed(1)} °C`    : '—',
  hum  : v => v != null ? `${(+v).toFixed(0)} %`     : '—',
  wind : v => v != null ? `${(+v).toFixed(1)} m/s`   : '—',
  rain : v => v != null ? `${(+v).toFixed(1)} mm`    : '—',
  rate : v => v != null ? `${(+v).toFixed(1)} mm/h`  : '—',
  deg  : v => v != null ? `${(+v).toFixed(0)}°`      : '—',
  date : iso => iso ? new Date(iso).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'}) : '—',
  iso  : (offsetDays=0) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().split('T')[0];
  },
};

function tempClass(t) {
  if (t == null) return 'text-slate-500';
  if (t > 35)   return 'text-red-400';
  if (t > 25)   return 'text-orange-400';
  if (t > 15)   return 'text-yellow-400';
  if (t > 5)    return 'text-sky-400';
  return 'text-blue-300';
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const bg   = {success:'bg-emerald-600',error:'bg-red-600',warning:'bg-amber-600',info:'bg-sky-600'}[type];
  const icon = {success:'fa-check-circle',error:'fa-circle-xmark',warning:'fa-triangle-exclamation',info:'fa-circle-info'}[type];
  const el   = document.createElement('div');
  el.className = `fixed bottom-5 right-5 z-[999] flex items-center gap-3 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-2xl ${bg} transition-all duration-300 fade`;
  el.innerHTML = `<i class="fas ${icon}"></i><span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ─── Modal helper ────────────────────────────────────────────────────────────
function modal(content) {
  document.getElementById('modals').innerHTML = `
    <div id="modalBackdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 fade">
      ${content}
    </div>`;
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
}
function closeModal() { document.getElementById('modals').innerHTML = ''; }
window.closeModal = closeModal;

// ─── API ─────────────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const r = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${r.status}`); }
  return r.status === 204 ? null : r.json();
}

async function loadAll() {
  [stations, sysStats] = await Promise.all([
    apiFetch('/stations'),
    apiFetch('/stations/stats/overview').catch(() => null),
  ]);
}

async function getStationData(id, opts = {}) {
  const qs = opts.startDate && opts.endDate
    ? `start_date=${opts.startDate}&end_date=${opts.endDate}&limit=5000`
    : `hours=${opts.hours || 24}&limit=2000`;
  return apiFetch(`/stations/${id}/data?${qs}`);
}

async function getStationStats(id, hours = 24) {
  return apiFetch(`/stations/${id}/stats?hours=${hours}`);
}

async function bulkExport(ids, opts = {}) {
  const qs = opts.startDate && opts.endDate
    ? `station_ids=${ids}&start_date=${opts.startDate}&end_date=${opts.endDate}`
    : `station_ids=${ids}&hours=${opts.hours || 24}`;
  return apiFetch(`/stations/bulk/export?${qs}`);
}

// ─── Destroy chart helper ─────────────────────────────────────────────────────
function killChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }

// ─── Chart defaults ───────────────────────────────────────────────────────────
const CHART_DEFAULTS = {
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#475569', maxRotation: 0, maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,.04)' } },
    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.05)' } },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════
const PAGES = [
  { id:'dashboard', icon:'fa-gauge-high',       label:'Dashboard'      },
  { id:'stations',  icon:'fa-tower-broadcast',   label:'Estaciones'     },
  { id:'map',       icon:'fa-map-location-dot',  label:'Mapa'           },
  { id:'analytics', icon:'fa-chart-line',        label:'Análisis'       },
  { id:'research',  icon:'fa-flask-vial',        label:'Investigación'  },
  { id:'add',       icon:'fa-circle-plus',       label:'Nueva estación' },
];

function navHTML() {
  const active = stations.filter(s => s.active).length;
  return `
  <header class="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700/60 shadow-xl">
    <div class="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

      <div class="flex items-center gap-3 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
          <i class="fas fa-cloud-sun-rain text-sky-400 text-sm"></i>
        </div>
        <span class="font-bold text-white tracking-tight text-sm hidden sm:block">WeatherNet</span>
        ${sysStats ? `
          <div class="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs">
            <span class="pulse w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            ${active} activa${active !== 1 ? 's' : ''}
          </div>` : ''}
      </div>

      <nav class="flex items-center gap-0.5 overflow-x-auto">
        ${PAGES.map(p => `
          <button onclick="goto('${p.id}')"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
              ${page === p.id
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}">
            <i class="fas ${p.icon} text-[11px]"></i>
            <span class="hidden md:inline">${p.label}</span>
          </button>`).join('')}
      </nav>
    </div>
  </header>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function dashboardHTML() {
  const s   = sysStats;
  const withData = stations.filter(s => s.latest_data);
  const noData   = stations.filter(s => !s.latest_data);

  return `
  <div class="space-y-6 fade">

    <!-- KPI strip -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ${kpi('fa-tower-broadcast', 'text-sky-400',    'bg-sky-500/10 border-sky-500/20',    'Total estaciones',   s?.total_stations   ?? '—')}
      ${kpi('fa-circle-check',   'text-emerald-400', 'bg-emerald-500/10 border-emerald-500/20', 'Activas',       s?.active_stations  ?? '—')}
      ${kpi('fa-circle-xmark',   'text-red-400',     'bg-red-500/10 border-red-500/20',    'Inactivas',          s?.inactive_stations ?? '—')}
      ${kpi('fa-database',       'text-violet-400',  'bg-violet-500/10 border-violet-500/20', 'Registros totales', (s?.total_records ?? 0).toLocaleString())}
    </div>

    <!-- Avg temp banner -->
    ${s?.avg_temperature_24h != null ? `
    <div class="flex items-center gap-5 bg-gradient-to-r from-slate-800 to-slate-800/40 border border-slate-700 rounded-2xl p-5">
      <div class="w-14 h-14 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
        <i class="fas fa-thermometer-half text-orange-400 text-2xl"></i>
      </div>
      <div>
        <p class="text-slate-400 text-xs font-medium uppercase tracking-wider">Temperatura promedio de la red · últimas 24 h</p>
        <p class="text-3xl font-bold text-white mt-0.5">${fmt.temp(s.avg_temperature_24h)}</p>
      </div>
    </div>` : ''}

    <!-- Stations with data -->
    ${withData.length > 0 ? `
    <div>
      <p class="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">Con datos recientes</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        ${withData.map(stationCardHTML).join('')}
      </div>
    </div>` : ''}

    <!-- Stations without data -->
    ${noData.length > 0 ? `
    <div>
      <p class="text-xs text-slate-600 font-semibold uppercase tracking-widest mb-3">Sin datos</p>
      <div class="flex flex-wrap gap-2">
        ${noData.map(s => `
          <button onclick="openStation('${s.id}')"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:border-slate-500 hover:text-slate-300 transition-all">
            <span class="w-1.5 h-1.5 rounded-full inline-block ${s.active ? 'bg-amber-400' : 'bg-red-500'}"></span>
            ${s.name}
          </button>`).join('')}
      </div>
    </div>` : ''}

    ${stations.length === 0 ? `
    <div class="text-center py-24 text-slate-600 border border-slate-800 rounded-2xl">
      <i class="fas fa-tower-broadcast text-5xl block mb-3"></i>
      <p class="font-medium">Sin estaciones registradas</p>
      <button onclick="goto('add')" class="mt-4 px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-medium transition-all">
        <i class="fas fa-plus mr-1"></i> Crear primera estación
      </button>
    </div>` : ''}
  </div>`;
}

function kpi(icon, color, bg, label, value) {
  return `
  <div class="flex items-center gap-4 p-5 rounded-2xl border ${bg}">
    <i class="fas ${icon} text-2xl ${color} shrink-0"></i>
    <div>
      <p class="text-slate-500 text-xs font-medium">${label}</p>
      <p class="text-white font-bold text-2xl mt-0.5">${value}</p>
    </div>
  </div>`;
}

function stationCardHTML(s) {
  const d  = s.latest_data;
  const tc = tempClass(d?.temperature);
  const borderColor = s.active ? 'border-emerald-700/40 hover:border-emerald-500/50' : 'border-red-700/40 hover:border-red-500/50';

  return `
  <div class="group bg-slate-800/50 border ${borderColor} rounded-2xl p-4 cursor-pointer transition-all hover:bg-slate-800"
       onclick="openStation('${s.id}')">

    <div class="flex items-start justify-between gap-2 mb-3">
      <div class="min-w-0">
        <p class="font-semibold text-white text-sm truncate">${s.name}</p>
        <p class="text-slate-500 text-xs truncate mt-0.5">
          <i class="fas fa-location-dot mr-1"></i>${s.location}
        </p>
      </div>
      <span class="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full
        ${s.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                   : 'bg-red-500/15 text-red-400 border border-red-500/30'}">
        ${s.active ? 'ACTIVA' : 'INACTIVA'}
      </span>
    </div>

    ${d ? `
    <div class="grid grid-cols-2 gap-2">
      ${mini('fa-thermometer-half', tc,            fmt.temp(d.temperature),    'Temperatura')}
      ${mini('fa-droplet',          'text-sky-400', fmt.hum(d.humidity),        'Humedad')}
      ${mini('fa-wind',             'text-cyan-400',fmt.wind(d.wind_speed_ms),  'Viento')}
      ${mini('fa-cloud-rain',       'text-indigo-400',fmt.rain(d.total_rainfall),'Lluvia')}
    </div>
    <p class="text-right text-[10px] text-slate-600 mt-2">
      <i class="fas fa-clock mr-1"></i>${fmt.date(d.timestamp)}
    </p>` : `
    <div class="text-center py-5 text-slate-600 text-xs">
      <i class="fas fa-satellite-dish block text-xl mb-1"></i>Sin datos disponibles
    </div>`}
  </div>`;
}

function mini(icon, color, value, label) {
  return `
  <div class="bg-slate-900/60 rounded-xl py-2.5 px-2 text-center">
    <i class="fas ${icon} ${color} text-base"></i>
    <p class="text-[10px] text-slate-600 mt-0.5">${label}</p>
    <p class="text-white text-xs font-bold mt-0.5">${value}</p>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATIONS LIST
// ═══════════════════════════════════════════════════════════════════════════════
function stationsHTML() {
  return `
  <div class="space-y-4 fade">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-bold text-white">
        Estaciones <span class="text-slate-600 font-normal text-sm">(${stations.length})</span>
      </h1>
      <button onclick="goto('add')"
        class="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-sky-500/20">
        <i class="fas fa-plus text-xs"></i> Nueva
      </button>
    </div>

    ${stations.length === 0 ? emptyState('tower-broadcast', 'Sin estaciones', `<button onclick="goto('add')" class="mt-4 px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-medium transition-all">Crear primera</button>`) : `
    <div class="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-700">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-4 py-3 text-left w-8">
                <input type="checkbox" id="chkAll" onchange="toggleAll(this.checked)"
                  class="rounded border-slate-600 bg-slate-700 text-sky-500 cursor-pointer">
              </th>
              <th class="px-4 py-3 text-left">Estación</th>
              <th class="px-4 py-3 text-left hidden md:table-cell">Ubicación</th>
              <th class="px-4 py-3 text-left hidden lg:table-cell">Coordenadas</th>
              <th class="px-4 py-3 text-left">Estado</th>
              <th class="px-4 py-3 text-left">Temp.</th>
              <th class="px-4 py-3 text-left hidden sm:table-cell">Humedad</th>
              <th class="px-4 py-3 text-left hidden lg:table-cell">Último dato</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700/50">
            ${stations.map(s => `
            <tr class="hover:bg-slate-700/30 transition-colors group">
              <td class="px-4 py-3">
                <input type="checkbox" value="${s.id}" ${selected.has(s.id) ? 'checked' : ''}
                  onchange="toggleOne('${s.id}', this.checked)"
                  class="rounded border-slate-600 bg-slate-700 text-sky-500 cursor-pointer">
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-white text-sm">${s.name}</p>
                <p class="text-slate-600 text-[10px] font-mono mt-0.5">${s.id}</p>
              </td>
              <td class="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">${s.location}</td>
              <td class="px-4 py-3 text-slate-500 text-[11px] font-mono hidden lg:table-cell">
                ${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}
              </td>
              <td class="px-4 py-3">
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full
                  ${s.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                             : 'bg-red-500/15 text-red-400 border border-red-500/30'}">
                  ${s.active ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td class="px-4 py-3 font-medium text-sm ${tempClass(s.latest_data?.temperature)}">
                ${fmt.temp(s.latest_data?.temperature)}
              </td>
              <td class="px-4 py-3 text-slate-400 text-sm hidden sm:table-cell">${fmt.hum(s.latest_data?.humidity)}</td>
              <td class="px-4 py-3 text-slate-600 text-xs hidden lg:table-cell">${fmt.date(s.last_data_time)}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button onclick="openStation('${s.id}')" class="text-sky-400 hover:text-sky-300 transition-colors" title="Ver detalles">
                    <i class="fas fa-eye text-xs"></i>
                  </button>
                  <button onclick="openEdit('${s.id}')" class="text-amber-400 hover:text-amber-300 transition-colors" title="Editar">
                    <i class="fas fa-pen text-xs"></i>
                  </button>
                  <button onclick="openDelete('${s.id}')" class="text-red-400 hover:text-red-300 transition-colors" title="Eliminar">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${selected.size > 0 ? `
    <div class="flex items-center gap-3 bg-sky-900/20 border border-sky-700/40 rounded-xl px-4 py-3">
      <i class="fas fa-circle-info text-sky-400 text-sm"></i>
      <span class="text-sky-300 text-sm">${selected.size} estación${selected.size !== 1 ? 'es' : ''} seleccionada${selected.size !== 1 ? 's' : ''}</span>
      <button onclick="goto('research')"
        class="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-medium transition-all">
        <i class="fas fa-flask-vial text-[10px]"></i> Exportar selección
      </button>
    </div>` : ''}
    `}
  </div>`;
}

function emptyState(icon, text, extra = '') {
  return `
  <div class="text-center py-20 text-slate-600 border border-slate-800 rounded-2xl">
    <i class="fas fa-${icon} text-4xl block mb-3"></i>
    <p class="font-medium text-slate-500">${text}</p>
    ${extra}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATION DETAIL
// ═══════════════════════════════════════════════════════════════════════════════
async function openStation(id) {
  const s = stations.find(x => x.id === id);
  if (!s) return;

  const app = document.getElementById('app');
  app.innerHTML = navHTML() + `
  <main class="max-w-screen-xl mx-auto px-4 py-6 space-y-5 fade">
    <button onclick="goto('stations')" class="text-slate-500 hover:text-white text-sm flex items-center gap-2 transition-colors">
      <i class="fas fa-arrow-left text-xs"></i> Volver a estaciones
    </button>

    <!-- Header card -->
    <div class="bg-gradient-to-r from-slate-800 to-slate-800/40 border border-slate-700 rounded-2xl p-6
                flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-3 mb-1">
          <h1 class="text-2xl font-bold text-white">${s.name}</h1>
          <span class="text-[10px] font-bold px-2.5 py-1 rounded-full border
            ${s.active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                       : 'bg-red-500/15 text-red-400 border-red-500/30'}">
            ${s.active ? 'ACTIVA' : 'INACTIVA'}
          </span>
        </div>
        <p class="text-slate-400 text-sm"><i class="fas fa-location-dot mr-1 text-slate-600"></i>${s.location}</p>
        <p class="text-slate-600 text-xs font-mono mt-0.5">${s.latitude.toFixed(6)}, ${s.longitude.toFixed(6)}</p>
        ${s.description ? `<p class="text-slate-500 text-sm mt-2">${s.description}</p>` : ''}
      </div>
      <div class="flex gap-2 shrink-0">
        <button onclick="openEdit('${s.id}')"
          class="px-4 py-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl text-sm hover:bg-amber-500/25 transition-all">
          <i class="fas fa-pen mr-1 text-xs"></i>Editar
        </button>
        <button onclick="openDelete('${s.id}')"
          class="px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-sm hover:bg-red-500/25 transition-all">
          <i class="fas fa-trash mr-1 text-xs"></i>Eliminar
        </button>
      </div>
    </div>

    <!-- Latest metrics grid -->
    ${s.latest_data ? `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${metricBox('fa-thermometer-half', tempClass(s.latest_data.temperature), 'Temperatura', fmt.temp(s.latest_data.temperature))}
      ${metricBox('fa-droplet',          'text-sky-400',    'Humedad',           fmt.hum(s.latest_data.humidity))}
      ${metricBox('fa-wind',             'text-cyan-400',   'Viento',            fmt.wind(s.latest_data.wind_speed_ms))}
      ${metricBox('fa-wind fa-flip-horizontal', 'text-teal-400', 'Ráfaga máx.', fmt.wind(s.latest_data.wind_gust_ms))}
      ${metricBox('fa-compass',          'text-purple-400', 'Dirección',         fmt.deg(s.latest_data.wind_direction_degrees))}
      ${metricBox('fa-cloud-rain',       'text-indigo-400', 'Lluvia acum.',      fmt.rain(s.latest_data.total_rainfall))}
      ${metricBox('fa-cloud-showers-heavy','text-blue-400', 'Tasa lluvia',       fmt.rate(s.latest_data.rain_rate_mm_per_hour))}
      ${metricBox('fa-temperature-low',  'text-sky-300',    'Punto de rocío',    fmt.temp(s.latest_data.dew_point))}
    </div>
    <p class="text-right text-xs text-slate-600"><i class="fas fa-clock mr-1"></i>Último dato: ${fmt.date(s.latest_data.timestamp)}</p>
    ` : emptyState('satellite-dish', 'Sin datos recientes')}

    <!-- Time-series chart -->
    <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 class="text-white font-semibold text-sm">Serie de tiempo</h2>
        <div id="periodBtns" class="flex gap-1.5">
          ${[['6','6 h'],['24','24 h'],['168','7 d'],['720','30 d']].map(([v,l]) => `
            <button data-hours="${v}" onclick="loadSeriesChart('${s.id}', ${v})"
              class="px-3 py-1 rounded-lg text-xs font-medium transition-all bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white">
              ${l}
            </button>`).join('')}
        </div>
      </div>
      <canvas id="seriesChart" style="max-height:320px"></canvas>
    </div>
  </main>`;

  loadSeriesChart(s.id, 24);
}

function metricBox(icon, color, label, value) {
  return `
  <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 text-center">
    <i class="fas ${icon} ${color} text-2xl mb-2"></i>
    <p class="text-slate-500 text-[11px]">${label}</p>
    <p class="text-white font-bold text-lg mt-0.5">${value}</p>
  </div>`;
}

async function loadSeriesChart(stationId, hours) {
  // Highlight active button
  document.querySelectorAll('#periodBtns button').forEach(btn => {
    const active = +btn.dataset.hours === +hours;
    btn.className = `px-3 py-1 rounded-lg text-xs font-medium transition-all
      ${active ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'}`;
  });

  const raw    = await getStationData(stationId, { hours });
  const sorted = [...raw].reverse(); // oldest first for chart

  killChart('series');
  const ctx = document.getElementById('seriesChart');
  if (!ctx || sorted.length === 0) return;

  charts.series = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sorted.map(d => d.timestamp),
      datasets: [
        { label: 'Temperatura (°C)', data: sorted.map(d => d.temperature),
          borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,.1)',
          tension: .35, pointRadius: 0, fill: true, yAxisID: 'yT' },
        { label: 'Humedad (%)', data: sorted.map(d => d.humidity),
          borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,.07)',
          tension: .35, pointRadius: 0, fill: true, yAxisID: 'yH' },
        { label: 'Lluvia (mm)', data: sorted.map(d => d.total_rainfall),
          borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,.08)',
          tension: .2, pointRadius: 0, fill: true, yAxisID: 'yT' },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { type: 'time', time: { tooltipFormat: 'dd/MM HH:mm', displayFormats: { hour:'HH:mm', day:'dd/MM' } },
             ticks: { color: '#475569', maxRotation: 0, maxTicksLimit: 8 },
             grid: { color: 'rgba(255,255,255,.04)' } },
        yT: { ticks: { color: '#f97316' }, grid: { color: 'rgba(255,255,255,.05)' },
              title: { display: true, text: '°C / mm', color: '#f97316', font: { size: 10 } } },
        yH: { position: 'right', ticks: { color: '#38bdf8' }, grid: { display: false },
              title: { display: true, text: '%', color: '#38bdf8', font: { size: 10 } } },
      },
    },
  });
}
window.loadSeriesChart = loadSeriesChart;

// ═══════════════════════════════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════════════════════════════
function mapHTML() {
  const active   = stations.filter(s => s.active).length;
  const inactive = stations.filter(s => !s.active).length;
  return `
  <div class="space-y-4 fade">
    <h1 class="text-lg font-bold text-white">Mapa de estaciones</h1>
    <div class="border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
      <div id="map-container" style="height:560px"></div>
    </div>
    <div class="grid grid-cols-3 gap-3 text-center text-sm">
      <div class="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4">
        <p class="text-2xl font-bold text-emerald-400">${active}</p>
        <p class="text-slate-500 text-xs mt-1">Activas</p>
      </div>
      <div class="bg-red-500/10 border border-red-500/25 rounded-xl p-4">
        <p class="text-2xl font-bold text-red-400">${inactive}</p>
        <p class="text-slate-500 text-xs mt-1">Inactivas</p>
      </div>
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p class="text-2xl font-bold text-white">${stations.length}</p>
        <p class="text-slate-500 text-xs mt-1">Total</p>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════
function analyticsHTML() {
  return `
  <div class="space-y-5 fade">
    <h1 class="text-lg font-bold text-white">Análisis por estación</h1>

    <!-- Controls -->
    <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Estación</label>
          <select id="aStation" onchange="runAnalytics()"
            class="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors">
            <option value="">— Selecciona una estación —</option>
            ${stations.map(s => `<option value="${s.id}">${s.name}  ·  ${s.location}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Período</label>
          <select id="aPeriod" onchange="runAnalytics()"
            class="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors">
            <option value="24">Últimas 24 horas</option>
            <option value="168">Última semana</option>
            <option value="720">Último mes</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Stats summary (populated by runAnalytics) -->
    <div id="aStatsRow" class="hidden grid grid-cols-2 sm:grid-cols-4 gap-3"></div>

    <!-- Charts area -->
    <div id="aCharts">
      ${emptyState('chart-line', 'Selecciona una estación para ver el análisis')}
    </div>
  </div>`;
}

async function runAnalytics() {
  const id    = document.getElementById('aStation')?.value;
  const hours = parseInt(document.getElementById('aPeriod')?.value || 24);
  if (!id) return;

  const [raw, stats] = await Promise.all([
    getStationData(id, { hours }),
    getStationStats(id, hours),
  ]);

  const sorted = [...raw].reverse();

  // --- Stats row ---
  const sr = document.getElementById('aStatsRow');
  if (sr && stats.record_count > 0) {
    sr.className = 'grid grid-cols-2 sm:grid-cols-4 gap-3';
    sr.innerHTML = [
      ['Temp. promedio', fmt.temp(stats.temperature?.avg), 'text-orange-400'],
      ['Temp. máxima',   fmt.temp(stats.temperature?.max), 'text-red-400'],
      ['Temp. mínima',   fmt.temp(stats.temperature?.min), 'text-sky-400'],
      ['Lluvia acum.',   fmt.rain(stats.total_rainfall),   'text-indigo-400'],
    ].map(([l, v, c]) => `
      <div class="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
        <p class="text-slate-500 text-xs mb-1">${l}</p>
        <p class="font-bold text-lg ${c}">${v}</p>
      </div>`).join('');
  }

  // --- Destroy old charts ---
  ['aTH','aW','aR'].forEach(killChart);

  document.getElementById('aCharts').innerHTML = `
    <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <p class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Temperatura y Humedad</p>
      <canvas id="cTH" style="max-height:260px"></canvas>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
        <p class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Velocidad del viento</p>
        <canvas id="cW" style="max-height:200px"></canvas>
      </div>
      <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
        <p class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Lluvia acumulada</p>
        <canvas id="cR" style="max-height:200px"></canvas>
      </div>
    </div>`;

  const labels = sorted.map(d => d.timestamp);
  const baseOpts = { ...CHART_DEFAULTS,
    scales: {
      x: { type: 'time', time: { tooltipFormat: 'dd/MM HH:mm', displayFormats: { hour:'HH:mm', day:'dd/MM' } },
           ticks: { color: '#475569', maxRotation: 0, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,.04)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.05)' } },
    },
  };

  charts.aTH = new Chart(document.getElementById('cTH'), {
    type: 'line',
    data: { labels, datasets: [
      { label:'Temperatura (°C)', data: sorted.map(d=>d.temperature), borderColor:'#f97316', backgroundColor:'rgba(249,115,22,.1)', tension:.3, pointRadius:0, fill:true, yAxisID:'yT' },
      { label:'Humedad (%)',      data: sorted.map(d=>d.humidity),    borderColor:'#38bdf8', backgroundColor:'rgba(56,189,248,.07)', tension:.3, pointRadius:0, fill:true, yAxisID:'yH' },
    ]},
    options: { ...baseOpts, scales: { ...baseOpts.scales,
      yT: { ticks:{color:'#f97316'}, grid:{color:'rgba(255,255,255,.05)'}, title:{display:true,text:'°C',color:'#f97316',font:{size:10}} },
      yH: { position:'right', ticks:{color:'#38bdf8'}, grid:{display:false}, title:{display:true,text:'%',color:'#38bdf8',font:{size:10}} },
    }},
  });

  charts.aW = new Chart(document.getElementById('cW'), {
    type: 'line',
    data: { labels, datasets: [
      { label:'Viento (m/s)', data: sorted.map(d=>d.wind_speed_ms), borderColor:'#34d399', backgroundColor:'rgba(52,211,153,.1)', tension:.3, pointRadius:0, fill:true },
    ]},
    options: baseOpts,
  });

  charts.aR = new Chart(document.getElementById('cR'), {
    type: 'bar',
    data: { labels, datasets: [
      { label:'Lluvia (mm)', data: sorted.map(d=>d.total_rainfall), backgroundColor:'rgba(99,102,241,.5)', borderColor:'#6366f1', borderWidth:1, borderRadius:2 },
    ]},
    options: baseOpts,
  });
}
window.runAnalytics = runAnalytics;

// ═══════════════════════════════════════════════════════════════════════════════
// RESEARCH / EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
const VARIABLES = [
  { id:'vTemp', field:'temperature',            col:'temperatura_c',    label:'Temperatura (°C)',       checked:true  },
  { id:'vHum',  field:'humidity',               col:'humedad_pct',      label:'Humedad (%)',             checked:true  },
  { id:'vWind', field:'wind_speed_ms',          col:'viento_ms',        label:'Viento (m/s)',            checked:true  },
  { id:'vGust', field:'wind_gust_ms',           col:'rafaga_ms',        label:'Ráfaga máx. (m/s)',       checked:false },
  { id:'vDir',  field:'wind_direction_degrees', col:'dir_viento_grados',label:'Dirección viento (°)',    checked:false },
  { id:'vRain', field:'total_rainfall',         col:'lluvia_acum_mm',   label:'Lluvia acumulada (mm)',   checked:true  },
  { id:'vRate', field:'rain_rate_mm_per_hour',  col:'tasa_lluvia_mm_h', label:'Tasa lluvia (mm/h)',      checked:false },
  { id:'vDew',  field:'dew_point',              col:'punto_rocio_c',    label:'Punto de rocío (°C)',     checked:false },
];

function researchHTML() {
  const allSel = selected.size === stations.length && stations.length > 0;
  return `
  <div class="space-y-5 fade">
    <div>
      <h1 class="text-lg font-bold text-white">Exportar datos para investigación</h1>
      <p class="text-slate-500 text-sm mt-0.5">Selecciona estaciones, define el rango de tiempo y elige las variables</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

      <!-- ── PANEL IZQUIERDO: Estaciones ────────────────────────────────── -->
      <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h2 class="text-white font-semibold text-sm">Estaciones</h2>
          <button onclick="researchToggleAll(!${allSel})"
            class="text-xs text-sky-400 hover:text-sky-300 transition-colors">
            ${allSel ? 'Deseleccionar todas' : 'Seleccionar todas'}
          </button>
        </div>

        <div class="space-y-1 flex-1 overflow-y-auto max-h-72 pr-0.5">
          ${stations.length === 0 ? `<p class="text-slate-600 text-xs text-center py-6">Sin estaciones</p>` :
            stations.map(s => `
            <label class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border
              ${selected.has(s.id) ? 'bg-sky-500/10 border-sky-500/30' : 'border-transparent hover:bg-slate-700/40'}">
              <input type="checkbox" value="${s.id}" ${selected.has(s.id) ? 'checked' : ''}
                onchange="toggleOne('${s.id}', this.checked); updateResearchCount()"
                class="rounded border-slate-600 bg-slate-700 text-sky-500 shrink-0 cursor-pointer">
              <div class="min-w-0 flex-1">
                <p class="text-white text-sm font-medium truncate">${s.name}</p>
                <p class="text-slate-500 text-xs truncate">${s.location}</p>
              </div>
              <span class="shrink-0 w-2 h-2 rounded-full ${s.active ? 'bg-emerald-400' : 'bg-red-400'}"></span>
            </label>`).join('')}
        </div>

        <p id="resCount" class="text-xs text-slate-600 border-t border-slate-700 pt-3">
          ${selected.size} de ${stations.length} seleccionadas
        </p>
      </div>

      <!-- ── PANEL DERECHO: Configuración ───────────────────────────────── -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Rango de tiempo -->
        <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h2 class="text-white font-semibold text-sm">Rango de tiempo</h2>

          <!-- Toggles -->
          <div class="flex gap-2 p-1 bg-slate-900/60 rounded-xl">
            <button id="btnRange" onclick="switchTimeMode('range')"
              class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all bg-sky-500 text-white">
              <i class="fas fa-calendar-days mr-1"></i> Por fechas
            </button>
            <button id="btnHours" onclick="switchTimeMode('hours')"
              class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-400 hover:text-white">
              <i class="fas fa-clock mr-1"></i> Período predefinido
            </button>
          </div>

          <!-- Date inputs -->
          <div id="rangeInputs" class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-slate-500 mb-1.5">Fecha inicio</label>
              <input type="date" id="startDate" value="${fmt.iso(7)}" max="${fmt.iso(0)}"
                class="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors cursor-pointer">
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1.5">Fecha fin</label>
              <input type="date" id="endDate"   value="${fmt.iso(0)}" max="${fmt.iso(0)}"
                class="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors cursor-pointer">
            </div>
          </div>

          <!-- Quick date presets -->
          <div id="datePresets" class="flex flex-wrap gap-2 items-center">
            <span class="text-xs text-slate-600">Atajos:</span>
            ${[['Hoy',0],['7 días',7],['15 días',15],['1 mes',30],['3 meses',90],['6 meses',180]].map(([l,d]) => `
              <button onclick="applyDatePreset(${d})"
                class="text-xs px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-400
                       hover:border-sky-500/50 hover:text-sky-400 hover:bg-sky-500/10 transition-all">
                ${l}
              </button>`).join('')}
          </div>

          <!-- Predefined hours -->
          <div id="hoursInputs" class="hidden">
            <label class="block text-xs text-slate-500 mb-1.5">Período</label>
            <select id="exportHours"
              class="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500">
              <option value="1">Última 1 hora</option>
              <option value="6">Últimas 6 horas</option>
              <option value="24" selected>Últimas 24 horas</option>
              <option value="72">Últimos 3 días</option>
              <option value="168">Última semana</option>
              <option value="720">Último mes</option>
            </select>
          </div>
        </div>

        <!-- Variables -->
        <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-white font-semibold text-sm">Variables</h2>
            <div class="flex gap-3 text-xs">
              <button onclick="setAllVars(true)"  class="text-sky-400 hover:text-sky-300 transition-colors">Todas</button>
              <button onclick="setAllVars(false)" class="text-slate-500 hover:text-slate-400 transition-colors">Ninguna</button>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${VARIABLES.map(v => `
            <label class="flex items-center gap-2.5 text-sm cursor-pointer select-none">
              <input type="checkbox" id="${v.id}" ${v.checked ? 'checked' : ''}
                class="rounded border-slate-600 bg-slate-700 text-sky-500 cursor-pointer">
              <span class="text-slate-300">${v.label}</span>
            </label>`).join('')}
          </div>
        </div>

        <!-- Format & Download -->
        <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h2 class="text-white font-semibold text-sm">Formato de exportación</h2>

          <div class="grid grid-cols-2 gap-3">
            <label id="fCSV" class="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all bg-sky-500/10 border-sky-500/40">
              <input type="radio" name="fmt" value="csv" checked onchange="updateFmtLabels()"
                class="text-sky-500 border-slate-600 bg-slate-700 cursor-pointer">
              <div>
                <p class="text-white text-sm font-medium">CSV</p>
                <p class="text-slate-500 text-xs">Excel · LibreOffice · R · MATLAB</p>
              </div>
            </label>
            <label id="fJSON" class="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all bg-slate-700/30 border-slate-600">
              <input type="radio" name="fmt" value="json" onchange="updateFmtLabels()"
                class="text-sky-500 border-slate-600 bg-slate-700 cursor-pointer">
              <div>
                <p class="text-white text-sm font-medium">JSON</p>
                <p class="text-slate-500 text-xs">Python · JavaScript · APIs</p>
              </div>
            </label>
          </div>

          <button onclick="doExport()"
            class="w-full py-3 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold rounded-xl
                   flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20 text-sm">
            <i class="fas fa-download"></i> Descargar datos
          </button>

          <p class="text-center text-xs text-slate-600">
            <i class="fas fa-circle-info mr-1"></i>
            Timestamps en UTC · Datos crudos del sensor sin modificar
          </p>
        </div>
      </div>
    </div>
  </div>`;
}

// Research helpers
function researchToggleAll(checked) { toggleAll(checked); goto('research'); }
window.researchToggleAll = researchToggleAll;

function updateResearchCount() {
  const el = document.getElementById('resCount');
  if (el) el.textContent = `${selected.size} de ${stations.length} seleccionadas`;
}
window.updateResearchCount = updateResearchCount;

function switchTimeMode(mode) {
  timeMode = mode;
  const active   = 'bg-sky-500 text-white';
  const inactive = 'text-slate-400 hover:text-white';
  document.getElementById('btnRange').className = `flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${mode==='range' ? active : inactive}`;
  document.getElementById('btnHours').className = `flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${mode==='hours' ? active : inactive}`;
  document.getElementById('rangeInputs').classList.toggle('hidden', mode !== 'range');
  document.getElementById('datePresets').classList.toggle('hidden', mode !== 'range');
  document.getElementById('hoursInputs').classList.toggle('hidden', mode !== 'hours');
}
window.switchTimeMode = switchTimeMode;

function applyDatePreset(days) {
  document.getElementById('startDate').value = fmt.iso(days);
  document.getElementById('endDate').value   = fmt.iso(0);
}
window.applyDatePreset = applyDatePreset;

function updateFmtLabels() {
  const isCSV = document.querySelector('[name=fmt][value=csv]').checked;
  const on  = 'bg-sky-500/10 border-sky-500/40';
  const off = 'bg-slate-700/30 border-slate-600';
  document.getElementById('fCSV').className  = `flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${isCSV ? on : off}`;
  document.getElementById('fJSON').className = `flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${!isCSV ? on : off}`;
}
window.updateFmtLabels = updateFmtLabels;

function setAllVars(checked) { VARIABLES.forEach(v => { const el = document.getElementById(v.id); if (el) el.checked = checked; }); }
window.setAllVars = setAllVars;

function getActiveVars() { return VARIABLES.filter(v => document.getElementById(v.id)?.checked); }

async function doExport() {
  if (selected.size === 0) { toast('Selecciona al menos una estación', 'warning'); return; }

  const vars   = getActiveVars();
  if (vars.length === 0) { toast('Selecciona al menos una variable', 'warning'); return; }

  const format = document.querySelector('[name=fmt]:checked')?.value || 'csv';
  let timeOpts;

  if (timeMode === 'range') {
    const s = document.getElementById('startDate')?.value;
    const e = document.getElementById('endDate')?.value;
    if (!s || !e)  { toast('Completa el rango de fechas', 'warning'); return; }
    if (s > e)     { toast('La fecha inicio debe ser anterior a la fecha fin', 'warning'); return; }
    timeOpts = { startDate: s, endDate: e };
  } else {
    timeOpts = { hours: parseInt(document.getElementById('exportHours')?.value || 24) };
  }

  toast('Preparando exportación…', 'info');

  try {
    const ids = Array.from(selected).join(',');
    const raw = await bulkExport(ids, timeOpts);

    // raw = { station_id: { station: {...}, data: [...] } }
    const entries      = Object.values(raw);
    const totalRecords = entries.reduce((n, e) => n + e.data.length, 0);

    if (totalRecords === 0) { toast('Sin datos para el período seleccionado', 'warning'); return; }

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);

    if (format === 'csv') {
      const varHeaders = vars.map(v => v.col);
      const header = ['estacion', 'ubicacion', 'latitud', 'longitud', 'timestamp', ...varHeaders].join(',');

      const rows = entries.flatMap(({ station: st, data }) =>
        data.map(d => {
          const base = [`"${st.name}"`, `"${st.location}"`, st.latitude, st.longitude, `"${d.timestamp}"`];
          const vals = vars.map(v => d[v.field] ?? '');
          return [...base, ...vals].join(',');
        })
      );
      download(`weather_${ts}.csv`, 'text/csv', [header, ...rows].join('\n'));
    } else {
      const payload = {
        exportado_en: new Date().toISOString(),
        periodo: timeMode === 'range'
          ? { inicio: timeOpts.startDate, fin: timeOpts.endDate }
          : { ultimas_horas: timeOpts.hours },
        estaciones: entries.map(({ station: st, data }) => ({
          id: st.id, nombre: st.name, ubicacion: st.location,
          latitud: st.latitude, longitud: st.longitude,
          registros: data.map(d => {
            const row = { timestamp: d.timestamp };
            vars.forEach(v => { row[v.col] = d[v.field] ?? null; });
            return row;
          }),
        })),
      };
      download(`weather_${ts}.json`, 'application/json', JSON.stringify(payload, null, 2));
    }

    toast(`✓ ${totalRecords.toLocaleString()} registros exportados`, 'success');
  } catch (err) {
    console.error(err);
    toast(`Error: ${err.message}`, 'error');
  }
}
window.doExport = doExport;

function download(filename, type, content) {
  const a  = document.createElement('a');
  a.href   = `data:${type};charset=utf-8,` + encodeURIComponent(content);
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD STATION
// ═══════════════════════════════════════════════════════════════════════════════
function addHTML() {
  return `
  <div class="max-w-xl mx-auto space-y-5 fade">
    <h1 class="text-lg font-bold text-white">Nueva estación meteorológica</h1>

    <form onsubmit="submitAdd(event)"
      class="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${field('ID único *', 'fId',  'text',   'EST_NORTE_01', '^[A-Za-z0-9_-]+$')}
        ${field('Nombre *',   'fName','text',   'Estación Norte')}
      </div>
      ${field('Ubicación *', 'fLoc', 'text', 'Ciudad, Estado, País')}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${field('Latitud *',  'fLat', 'number', '19.4326',  null, '-90','90','0.000001')}
        ${field('Longitud *', 'fLng', 'number', '-99.1332', null, '-180','180','0.000001')}
      </div>
      <div>
        <label class="block text-xs text-slate-400 mb-1.5 font-medium">Descripción</label>
        <textarea id="fDesc" rows="3" placeholder="Descripción opcional de la estación…"
          class="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm
                 focus:outline-none focus:border-sky-500 transition-colors resize-none placeholder:text-slate-600"></textarea>
      </div>

      <div class="flex gap-3 pt-1">
        <button type="submit"
          class="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-sky-500/20">
          <i class="fas fa-save mr-1"></i> Crear estación
        </button>
        <button type="button" onclick="goto('stations')"
          class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl text-sm transition-all">
          Cancelar
        </button>
      </div>
    </form>
  </div>`;
}

function field(label, id, type, placeholder, pattern, min, max, step) {
  return `
  <div>
    <label class="block text-xs text-slate-400 mb-1.5 font-medium">${label}</label>
    <input type="${type}" id="${id}" placeholder="${placeholder}"
      ${pattern ? `pattern="${pattern}"` : ''}
      ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''}
      ${step ? `step="${step}"` : ''}
      class="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm
             focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600">
  </div>`;
}

async function submitAdd(e) {
  e.preventDefault();
  const data = {
    id:          document.getElementById('fId').value.trim(),
    name:        document.getElementById('fName').value.trim(),
    location:    document.getElementById('fLoc').value.trim(),
    latitude:    parseFloat(document.getElementById('fLat').value),
    longitude:   parseFloat(document.getElementById('fLng').value),
    description: document.getElementById('fDesc').value.trim(),
  };
  if (isNaN(data.latitude) || isNaN(data.longitude)) { toast('Coordenadas inválidas', 'error'); return; }
  try {
    const station = await apiFetch('/stations/', { method:'POST', body: JSON.stringify(data) });
    toast('✓ Estación creada', 'success');
    await loadAll();
    showStationCreated(station);
  } catch (err) { toast(`Error: ${err.message}`, 'error'); }
}
window.submitAdd = submitAdd;

function showStationCreated(station) {
  const payload = JSON.stringify({
    station_id: station.id,
    temperature: 23.5,
    humidity: 65.0,
    wind_speed_ms: 2.1,
    wind_gust_ms: 3.4,
    wind_direction_degrees: 180,
    total_rainfall: 0.0,
    rain_rate_mm_per_hour: 0.0,
  }, null, 2).replace(/</g,'&lt;').replace(/>/g,'&gt;');

  document.getElementById('app').querySelector('main').innerHTML = `
  <div class="max-w-2xl mx-auto space-y-5 fade">

    <!-- Header -->
    <div class="flex items-center gap-4">
      <div class="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
        <i class="fas fa-check text-emerald-400 text-lg"></i>
      </div>
      <div>
        <h1 class="text-lg font-bold text-white">Estación creada correctamente</h1>
        <p class="text-slate-500 text-sm">${station.name} · ${station.location}</p>
      </div>
    </div>

    <!-- Step 1: ID -->
    <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3">
      <div class="flex items-center gap-2 mb-1">
        <span class="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 text-xs font-bold flex items-center justify-center">1</span>
        <p class="text-sm font-semibold text-white">Guarda el ID de la estación</p>
      </div>
      <p class="text-slate-400 text-xs">Este ID identifica de forma única a esta estación. Lo necesitas para configurar cada ESP32 o sensor que le enviará datos.</p>
      <div class="flex items-center gap-2">
        <code id="stationIdCode" class="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sky-400 font-mono text-sm break-all">${station.id}</code>
        <button onclick="navigator.clipboard.writeText('${station.id}').then(()=>toast('ID copiado','success'))"
          class="px-3 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-all shrink-0" title="Copiar ID">
          <i class="fas fa-copy"></i>
        </button>
      </div>
    </div>

    <!-- Step 2: ESP32 payload -->
    <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3">
      <div class="flex items-center gap-2 mb-1">
        <span class="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 text-xs font-bold flex items-center justify-center">2</span>
        <p class="text-sm font-semibold text-white">Configura el ESP32</p>
      </div>
      <p class="text-slate-400 text-xs">El sensor debe hacer un <code class="text-sky-400 bg-slate-900 px-1 rounded">POST /api/data/submit</code> con el siguiente JSON. Sustituye los valores con las lecturas reales.</p>
      <pre class="bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs text-emerald-300 overflow-x-auto font-mono leading-relaxed">${payload}</pre>
      <p class="text-slate-500 text-xs">Campos opcionales: <span class="text-slate-400">wind_gust_ms, wind_direction_degrees, total_rainfall, rain_rate_mm_per_hour</span> (se asumen 0 si se omiten).</p>
    </div>

    <!-- Step 3: Verify -->
    <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-2">
      <div class="flex items-center gap-2 mb-1">
        <span class="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 text-xs font-bold flex items-center justify-center">3</span>
        <p class="text-sm font-semibold text-white">Verifica la recepción</p>
      </div>
      <p class="text-slate-400 text-xs">Una vez que el sensor empiece a enviar datos, puedes verlos en <strong class="text-white">Dashboard → Estaciones → Analytics</strong>. El mapa también mostrará la estación con su última lectura.</p>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-1">
      <button onclick="goto('stations')"
        class="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-sky-500/20">
        <i class="fas fa-tower-broadcast mr-1.5"></i> Ver estaciones
      </button>
      <button onclick="goto('map')"
        class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-all">
        <i class="fas fa-map-location-dot mr-1.5"></i> Ver mapa
      </button>
      <button onclick="goto('add')"
        class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-all">
        <i class="fas fa-plus mr-1.5"></i> Otra estación
      </button>
    </div>
  </div>`;
}
window.showStationCreated = showStationCreated;

// ═══════════════════════════════════════════════════════════════════════════════
// CRUD MODALS
// ═══════════════════════════════════════════════════════════════════════════════
function openEdit(id) {
  const s = stations.find(x => x.id === id);
  if (!s) return;
  modal(`
  <div class="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-white font-semibold">Editar estación</h3>
      <button onclick="closeModal()" class="text-slate-500 hover:text-white transition-colors text-lg">&times;</button>
    </div>
    <div class="space-y-3">
      <input id="eN"   value="${s.name}"     placeholder="Nombre"    class="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500">
      <input id="eL"   value="${s.location}" placeholder="Ubicación" class="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500">
      <div class="grid grid-cols-2 gap-3">
        <input id="eLat" type="number" step="0.000001" value="${s.latitude}"  class="bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" placeholder="Latitud">
        <input id="eLng" type="number" step="0.000001" value="${s.longitude}" class="bg-slate-900 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" placeholder="Longitud">
      </div>
      <label class="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer select-none">
        <input type="checkbox" id="eActive" ${s.active ? 'checked' : ''} class="rounded border-slate-600 bg-slate-700 text-sky-500 cursor-pointer">
        Estación activa
      </label>
    </div>
    <div class="flex gap-3 pt-1">
      <button onclick="saveEdit('${s.id}')"
        class="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-semibold transition-all">
        <i class="fas fa-save mr-1"></i> Guardar cambios
      </button>
      <button onclick="closeModal()" class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-all">Cancelar</button>
    </div>
  </div>`);
}
window.openEdit = openEdit;

async function saveEdit(id) {
  const updates = {
    name:      document.getElementById('eN').value.trim(),
    location:  document.getElementById('eL').value.trim(),
    latitude:  parseFloat(document.getElementById('eLat').value),
    longitude: parseFloat(document.getElementById('eLng').value),
    active:    document.getElementById('eActive').checked,
  };
  if (isNaN(updates.latitude) || isNaN(updates.longitude)) { toast('Coordenadas inválidas', 'error'); return; }
  try {
    await apiFetch(`/stations/${id}`, { method:'PUT', body: JSON.stringify(updates) });
    closeModal();
    toast('✓ Estación actualizada', 'success');
    await loadAll();
    goto(page);
  } catch (err) { toast(`Error: ${err.message}`, 'error'); }
}
window.saveEdit = saveEdit;

function openDelete(id) {
  const s = stations.find(x => x.id === id);
  if (!s) return;
  modal(`
  <div class="bg-slate-800 border border-red-700/40 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
    <div class="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
      <i class="fas fa-triangle-exclamation text-red-400 text-xl"></i>
    </div>
    <div>
      <h3 class="text-white font-semibold text-lg">Eliminar estación</h3>
      <p class="text-slate-400 text-sm mt-1">¿Eliminar <strong class="text-white">${s.name}</strong> y <em>todos</em> sus datos?</p>
      <p class="text-red-400 text-xs mt-2">Esta acción no se puede deshacer.</p>
    </div>
    <div class="flex gap-3">
      <button onclick="closeModal()" class="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-all">Cancelar</button>
      <button onclick="doDelete('${id}')"
        class="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl text-sm font-semibold transition-all">
        <i class="fas fa-trash mr-1"></i> Eliminar
      </button>
    </div>
  </div>`);
}
window.openDelete = openDelete;

async function doDelete(id) {
  try {
    await apiFetch(`/stations/${id}`, { method:'DELETE' });
    closeModal();
    toast('Estación eliminada', 'success');
    selected.delete(id);
    await loadAll();
    goto('stations');
  } catch (err) { toast(`Error: ${err.message}`, 'error'); }
}
window.doDelete = doDelete;

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION
// ═══════════════════════════════════════════════════════════════════════════════
function toggleOne(id, checked) { checked ? selected.add(id) : selected.delete(id); }
function toggleAll(checked)     { stations.forEach(s => checked ? selected.add(s.id) : selected.delete(s.id)); }
window.toggleOne = toggleOne;
window.toggleAll = (c) => { toggleAll(c); render(); };

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
function goto(p) { page = p; render(); }
window.goto = goto;
window.openStation = openStation;

function render() {
  MapModule.destroyMap?.();
  const app = document.getElementById('app');
  let body  = '';

  switch (page) {
    case 'dashboard': body = dashboardHTML(); break;
    case 'stations':  body = stationsHTML();  break;
    case 'map':       body = mapHTML();        break;
    case 'analytics': body = analyticsHTML();  break;
    case 'research':  body = researchHTML();   break;
    case 'add':       body = addHTML();        break;
    default:          body = dashboardHTML();
  }

  app.innerHTML = navHTML() + `
    <main class="max-w-screen-2xl mx-auto px-4 py-6">${body}</main>`;

  if (page === 'map') {
    setTimeout(() => {
      MapModule.initMap('map-container', stations);  // already calls fitMapBounds internally
      // Delegate popup button clicks (Leaflet popups are inside the map container)
      document.getElementById('map-container').addEventListener('click', e => {
        const vBtn = e.target.closest('.view-station-btn');
        const zBtn = e.target.closest('.zoom-station-btn');
        if (vBtn) openStation(vBtn.dataset.stationId);
        if (zBtn) MapModule.highlightMarker(zBtn.dataset.stationId);
      });
    }, 150);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════════════════
async function init() {
  try {
    await loadAll();
    render();
  } catch (err) {
    console.error(err);
    document.getElementById('app').innerHTML = `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center space-y-4 p-8 max-w-sm">
        <div class="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
          <i class="fas fa-circle-exclamation text-red-400 text-2xl"></i>
        </div>
        <p class="text-white font-semibold text-lg">Sin conexión con el servidor</p>
        <p class="text-slate-500 text-sm">${err.message}</p>
        <button onclick="location.reload()"
          class="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-medium transition-all">
          <i class="fas fa-rotate-right mr-1"></i> Reintentar
        </button>
      </div>
    </div>`;
  }
}

init();

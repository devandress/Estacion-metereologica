# 🎨 GUÍA RÁPIDA - Nuevo Frontend

## 🚀 Inicio Rápido (2 minutos)

```bash
cd /home/andy/weather_app
./quickstart.sh
# Abre: http://localhost:8080
```

---

## 📊 Dashboard

**¿Qué ves?**
- 4 tarjetas con estadísticas del sistema
- 6 estaciones más recientes
- Botones Ver y Editar en cada tarjeta

**¿Qué puedes hacer?**
- Haz clic en "Ver" → Ve detalles de la estación
- Haz clic en "Editar" → Abre modal de edición
- Haz clic en estación → Va a vista de detalles

---

## 📍 Mapa

**¿Qué ves?**
- Mapa interactivo con estaciones (puntos verdes/rojos)
- Contador de estaciones activas/inactivas
- Cluster automático al hacer zoom out

**¿Qué puedes hacer?**
- **Zoom** con rueda del mouse
- **Arrastra** el mapa con mouse
- **Haz clic** en un marcador → Ver popup
- **Pasa mouse** sobre marcador → Ver info
- **Botón Mapa/Satélite** → Cambiar vista
- **Botón Zoom** en popup → Zoom a estación

**Colores en el mapa:**
- 🟢 Verde = Estación activa
- 🔴 Rojo = Estación inactiva

---

## 🏢 Estaciones

**¿Qué ves?**
- Tabla completa de todas las estaciones
- Columnas: Nombre, Ubicación, Coordenadas, Estado, Última Actualización

**¿Qué puedes hacer?**
- ☐ Checkbox para **seleccionar estaciones**
- ☑ Checkbox con check para **seleccionar todas**
- 👁️ **Ver** → Ver detalles completos
- ✏️ **Editar** → Abrir modal de edición
- 🗑️ **Eliminar** → Confirmar y eliminar (¡cuidado!)

**Para exportar después:**
1. Selecciona estaciones (checkboxes)
2. Ve a pestaña Exportar
3. Las estaciones ya estarán seleccionadas

---

## ➕ Nueva Estación

**Campos a llenar:**
- **ID Estación** (ej: ESP32_001)
- **Nombre** (ej: Estación Central)
- **Ubicación** (ej: Madrid, España)
- **Latitud** (ej: 40.4168)
- **Longitud** (ej: -3.7038)
- **Descripción** (opcional)

**Consejo:** Asegúrate que las coordenadas sean correctas para mejor visualización en el mapa.

**Botones:**
- 💾 Crear Estación → Guarda y vuelve a tabla
- ❌ Cancelar → Vuelve a Estaciones sin guardar

---

## 📥 Exportar

**Paso 1: Seleccionar estaciones**
- Ve a pestaña Estaciones
- Usa checkboxes para seleccionar
- Verás el contador actualizado

**Paso 2: Ir a Exportar**
- Verás lista de seleccionadas

**Paso 3: Elegir período**
- 📌 1 hora
- 📌 6 horas
- 📌 24 horas (recomendado)
- 📌 3 días
- 📌 1 semana
- 📌 1 mes

**Paso 4: Elegir formato**
- 📄 JSON (estructura completa)
- 📊 CSV (para Excel/Sheets)

**Paso 5: Descargar**
- Haz clic en "Descargar Datos"
- Se guarda como `weather_export_YYYY-MM-DD.ext`

**Archivos JSON:**
```json
[
  {
    "name": "Estación Central",
    "location": "Madrid",
    "data": [
      {
        "temperature": 23.5,
        "humidity": 65,
        "wind_speed": 12,
        "rainfall": 0,
        "timestamp": "2025-12-16T14:30:00"
      }
    ]
  }
]
```

**Archivos CSV:**
```
station,temperature,humidity,wind_speed,timestamp
Estación Central,23.5,65,12,2025-12-16T14:30:00
```

---

## 📈 Análisis

**¿Qué ves?**
- Selector de estación
- Selector de período
- Gráfico de barras con 3 series

**¿Qué puedes hacer?**

1. **Selecciona una estación**
   - Dropdown con todas disponibles

2. **Selecciona período**
   - 24 horas
   - 1 semana
   - 1 mes

3. **Ve el gráfico**
   - Azul = Promedio
   - Verde = Mínimo
   - Rojo = Máximo

4. **Datos mostrados**
   - Temperatura (°C)
   - Humedad (%)
   - Velocidad del viento (km/h)

**Interactuar con gráfico:**
- Pasa mouse sobre barras para ver valores
- Haz clic en leyenda para ocultar series
- Scroll para zoom

---

## ⚙️ Ajustes

**Información del Sistema:**
- API URL
- Versión de la app

**Actualizar Datos:**
- 🔄 Recarga todas las estaciones desde API
- Útil si agregaste nuevas

**Datos Locales:**
- 🧹 Limpiar caché (elimina datos del navegador)
- Útil para reiniciar si hay problemas

---

## 🎨 Interacción General

### Notificaciones

Verás mensajes emergentes en la esquina superior derecha:

```
✅ Verde   = Éxito (operación completada)
❌ Rojo    = Error (algo salió mal)
⚠️ Amarillo = Advertencia (cuidado)
ℹ️ Azul     = Información (nota general)
```

Las notificaciones desaparecen automáticamente después de 3 segundos.

### Modales de Confirmación

Para acciones importantes (eliminar, etc.):

```
┌─────────────────────────┐
│ Confirmar eliminación   │
├─────────────────────────┤
│ ¿Estás seguro de        │
│ eliminar esta estación? │
├─────────────────────────┤
│ [Cancelar] [Confirmar]  │
└─────────────────────────┘
```

- Haz clic en área gris → Cierra sin hacer nada
- **Cancelar** → No hacer nada
- **Confirmar** → Ejecutar acción

### Hover Effects

Casi todos los elementos responden al mouse:

```
Botones:         Cambio de color + sombra
Tarjetas:        Aumento de sombra + scale up
Filas de tabla:  Fondo azul suave
Enlaces:         Subrayado + color azul
```

---

## 🐛 Solución de Problemas

### "No puedo ver las estaciones"
- ✓ Verifica que la API esté corriendo (http://localhost:8000)
- ✓ Crea al menos una estación en "Nueva Estación"
- ✓ Recarga la página (F5)

### "El mapa no carga"
- ✓ Espera 2-3 segundos (carga Leaflet)
- ✓ Verifica conexión a internet (necesita OpenStreetMap)
- ✓ Recarga la página

### "No puedo exportar"
- ✓ Selecciona al menos una estación en tabla
- ✓ Verifica que haya datos (última actualización no vacía)

### "Las notificaciones no aparecen"
- ✓ Verifica volumen del navegador
- ✓ No es sonido, es visual en esquina superior derecha

---

## 💡 Tips y Tricks

### Para trabajar eficientemente:

1. **Selecciona múltiples estaciones:**
   - Ve a Estaciones
   - Usa checkbox en header para seleccionar todas
   - Luego ve a Exportar

2. **Zoom rápido en mapa:**
   - Haz clic en "Zoom" en popup de marcador
   - O double-click en marcador

3. **Búsqueda en tabla:**
   - Ctrl+F (búsqueda del navegador)
   - Busca nombre de estación

4. **Crear muchas estaciones:**
   - Nueva → Llena form
   - Luego "Nueva Estación" nuevamente (form limpio)

5. **Editar sin cerrar:**
   - Abre modal de edición
   - Cambia nombre, ubicación, etc.
   - Confirma → Vuelve a tabla con datos actualizados

---

## 📱 En Móvil

La app funciona en celulares:

```
✅ Dashboard    - ✓ Funciona bien
✅ Mapa         - ✓ Touch zoom/pan
✅ Estaciones   - ✓ Scroll vertical
✅ Análisis     - ✓ Gráficos responsive
✅ Exportar     - ✓ Descarga normal
✅ Formularios  - ✓ Input keyboard
```

**Consejo:** En móvil usa modo landscape para tablas.

---

## 🎓 Guía por Rol

### 👨‍💼 Gerente (ver resumen rápido)
1. Abre Dashboard
2. Ve 4 números principales
3. Ve últimas 6 estaciones
4. ¡Listo!

### 🔧 Técnico (gestionar estaciones)
1. Ve a Estaciones
2. Crea nuevas (pestaña Nueva)
3. Edita existentes
4. Monitorea estado (Activa/Inactiva)

### 📊 Analista (analizar datos)
1. Ve a Análisis
2. Selecciona estación
3. Elige período
4. Interpreta gráficos

### 📤 Admin (exportar datos)
1. Va a Estaciones
2. Selecciona estaciones
3. Va a Exportar
4. Elige formato (JSON/CSV)
5. Descarga

---

## ⌨️ Atajos

```
Ctrl+F          = Buscar en tabla (navegador)
Tab             = Navegar entre campos (formulario)
Enter           = Confirmar formulario
Esc             = Cerrar modal (a veces)
F5              = Recargar página
Ctrl+Shift+J    = Ver console (desarrollo)
```

---

**Versión:** 2.0.0  
**Última actualización:** 16 de diciembre de 2025  
**Estado:** ✅ COMPLETO Y FUNCIONAL

¡Disfruta la nueva interfaz! 🎉

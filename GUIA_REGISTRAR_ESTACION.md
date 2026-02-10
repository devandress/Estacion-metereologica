# 📱 Guía FÁCIL: Cómo Registrar tu Estación Meteorológica

## 🎯 En 5 minutos - Sin Jerga Técnica

### Paso 1: Abre el Formulario
1. Ve a tu navegador (Chrome, Firefox, Safari, Edge)
2. Escribe en la barra de direcciones: **http://localhost:8081**
   - Si estás en otra computadora: **http://[IP_DEL_RASPBERRY]:8081**

### Paso 2: Haz Clic en "➕ Nueva Estación"

### Paso 3: Completa 4 Campos Simples

#### Campo 1: Nombre 🏷️
Pon cualquier nombre para identificar tu estación:
- ✅ "Escuela San Pedro"
- ✅ "Casa de María"
- ✅ "Patio Principal"

#### Campo 2: Ubicación 📍
Escribe la dirección:
- ✅ "Calle Principal 123, México"
- ✅ "Barrio Centro"
- ✅ "Parque Municipal"

#### Campo 3 & 4: Latitud y Longitud 🗺️
Estos son dos números que dicen DÓNDE está tu estación

**¿Cómo los obtengo?**

Opción A - Forma SÚPER FÁCIL (recomendado):
1. Abre [Google Maps](https://maps.google.com) en otra pestaña
2. Busca tu dirección (escribe "Calle Principal 123")
3. Haz clic derecho en el marcador rojo que aparece
4. Verás dos números separados por coma: **19.4326, -99.1332**
5. El primer número (19.4326) → va en **Latitud**
6. El segundo número (-99.1332) → va en **Longitud**

Opción B - Copiar exactamente:
```
Latitud: 19.4326
Longitud: -99.1332
```

#### Campo 5: Descripción (opcional) 📝
Puedes dejar vacío o escribir algo así:
- "Estación en el patio de la escuela, bajo el árbol"
- "Junto a la puerta principal"
- Cualquier nota que te ayude a recordar

### Paso 4: ¡Clic en "Crear Estación"! ✨

Listo. Verás un **ID especial** que necesitarás para el ESP32.

---

## 🆔 ¿Qué es ese ID que aparece?

Es un código único como:
```
f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**¡GUARDA ESTE ID!** Lo necesitarás en el paso de programar el ESP32.

---

## 📊 Ver mis Estaciones

En la pestaña **"Mis Estaciones"** verás:
- ✓ Nombre
- ✓ Ubicación  
- ✓ Si está activa o inactiva
- ✓ El ID (para copiar)

### ¿Qué significa "Activa"?
- 🟢 **Activa**: El ESP32 está enviando datos cada 30 segundos
- 🔴 **Inactiva**: El ESP32 todavía no está conectado

---

## 🆘 Problemas Frecuentes

### "No aparecen mis estaciones"
→ Recarga la página (F5 o Cmd+R)

### "El Google Maps no me deja ver las coordenadas"
→ Haz clic derecho en el PIN rojo (no en la casilla de búsqueda)

### "Confundí Latitud y Longitud"
→ Puedes volver a la pestaña "Mis Estaciones" y haz clic para editar

### "Necesito cambiar el nombre después"
→ ¡Sin problema! Desde "Mis Estaciones" puedes editar en cualquier momento

---

## ✅ Checklist Final

```
☐ Tengo un navegador abierto
☐ Entré en http://localhost:8081 (o la IP del Raspberry)
☐ Completé: Nombre, Ubicación, Latitud, Longitud
☐ Hice clic en "Crear Estación"
☐ Copié el ID que aparece
☐ La estación está en "Mis Estaciones"
```

Si todo está en la lista, ¡LISTO! 🎉

El siguiente paso es programar el ESP32 con este ID.

---

## 🎓 Ejemplo Completo

Supongamos que quiero registrar la escuela "San Pedro" en México:

| Campo | Valor |
|-------|-------|
| **Nombre** | Escuela San Pedro |
| **Ubicación** | Avenida Juárez 456, CDMX |
| **Latitud** | 19.4326 |
| **Longitud** | -99.1332 |
| **Descripción** | Estación en patio trasero |

→ Clic "Crear Estación" → ¡Listo! ✅

---

## 📞 Necesito Ayuda

Si algo no funciona:

1. Revisa la pestaña "❓ Ayuda" en la misma página
2. Recarga la página (F5)
3. Limpia el navegador: Ctrl+Shift+Delete (datos guardados)
4. Intenta en otro navegador

---

**Versión:** 1.0 Simplificada
**Estado:** Listo para usar ✅

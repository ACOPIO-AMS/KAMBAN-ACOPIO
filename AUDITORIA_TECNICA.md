# AUDITORÍA TÉCNICA - KAMBAN ACOPIO V2 PRODUCCIÓN
Fecha de revisión: 2026-07-08 17:57:20
## 1. Archivos requeridos
- OK: `index.html`
- OK: `manifest.json`
- OK: `service-worker.js`
- OK: `apps_script.gs`
- OK: `README.md`
- OK: `css/estilos.css`
- OK: `js/config.js`
- OK: `js/utilidades.js`
- OK: `js/db.js`
- OK: `js/reglas.js`
- OK: `js/sincronizacion.js`
- OK: `js/seguimiento.js`
- OK: `js/admin.js`
- OK: `js/app.js`
- OK: `icons/icon-192.png`
- OK: `icons/icon-512.png`

## 2. Validación JavaScript
- OK sintaxis: `admin.js`
- OK sintaxis: `app.js`
- OK sintaxis: `config.js`
- OK sintaxis: `db.js`
- OK sintaxis: `reglas.js`
- OK sintaxis: `seguimiento.js`
- OK sintaxis: `sincronizacion.js`
- OK sintaxis: `utilidades.js`

## 3. Revisión de sincronización
- OK: la sincronización marca registros por ID y no reemplaza toda la base local.
- OK: POST hacia Apps Script usa modo compatible `no-cors`.

## 4. Revisión de borrado
- OK: el borrado local se ejecuta desde ADMIN mediante botón manual.
- OK: no se detecta limpieza automática activa.

## 5. Revisión de reglas de eventos
- OK: PARADA solo en CHANCADO con INICIO previo
- OK: CHANCADO bloquea FINAL si último evento es PARADA
- OK: DESCARGUIO EN STOCK exige FINAL
- OK: SALIDA STOCK exige EN STOCK previo
- OK: pendientes ignora FINAL

## 6. Revisión de Kanban
- OK: Kanban puede alimentarse desde Google Sheets/Drive mediante `action=list`.
- OK: Kanban muestra finalizados solo del día actual.

## 7. Riesgos detectados y recomendaciones
- RIESGO: si en GitHub no subes carpetas `css`, `js` e `icons`, la app no funcionará.
- RIESGO: `apps_script.gs` aún tiene `PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEETS`; debe reemplazarse antes de usar Drive.
- RECOMENDACIÓN: el Kanban definitivo debe alimentarse desde una hoja consolidada `KANBAN` cuando prepares la BD. Por ahora lee historial completo desde Drive.
- RECOMENDACIÓN: no usar más `index.html` descargado en celulares; usar solo GitHub Pages/PWA.
- RECOMENDACIÓN: cuando actualices archivos en GitHub, cambiar versión de caché en `service-worker.js` para forzar actualización.

## 8. Estado Apps Script
- PENDIENTE: reemplazar `PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEETS` por el ID real de tu archivo Google Sheets.

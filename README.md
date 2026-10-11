# KANBAN QR 3.0 — paquete limpio

Este paquete contiene solo los archivos necesarios para producción y un único backend de Apps Script.

## GitHub Pages
Suba a la raíz del repositorio: `index.html`, `manifest.json`, `service-worker.js` y las carpetas `css`, `icons`, `js`, `backend`.

No cambie la URL del Apps Script en `js/config.js`. Se conservó el mismo endpoint y las mismas claves de almacenamiento local para no perder los registros pendientes existentes en los equipos.

## Google Apps Script
El archivo que debe quedar como backend es:

`backend/INGRESO_DE_DATOS_KANBAN_V3_0.gs`

En el proyecto de Apps Script elimine o desactive las copias antiguas que definan `doGet` o `doPost`, deje una sola implementación de estas funciones y pegue el contenido completo del archivo anterior. Después: Guardar > Implementar > Administrar implementaciones > Editar > Nueva versión > Implementar. Mantenga la misma implementación/URL `/exec`.

## Reglas corregidas
- Los tiempos calculados nunca bloquean el guardado ni la confirmación por ID.
- Permanencia = FINAL - RECEPCIÓN; si no existe RECEPCIÓN, FINAL - INICIO.
- Espera = INICIO - RECEPCIÓN cuando ambos eventos existen.
- Paradas = suma de (REINICIO - PARADA). Si no hubo parada, queda vacío.
- Proceso efectivo = (FINAL - INICIO) - total de paradas.
- Los tiempos se guardan como números en minutos.
- DESCARGUIO + PATIO: segunda lectura normal genera FINAL y EN STOCK como dos registros independientes.
- Se mantiene lote de sincronización de 4 registros y confirmación individual por ID.
- No borre caché, datos del navegador ni desinstale la PWA mientras existan pendientes.

## Verificación posterior
1. Abra la URL `/exec?action=ping` del Apps Script. Debe responder `ok:true`, `version:"3.0"` y `build:"v3.0-sync-tiempos-r2"`.
2. Abra GitHub Pages en un equipo con conexión y espere la actualización.
3. En Administrador use `PROBAR SINCRONIZACIÓN EN TODOS LOS EQUIPOS`.
4. Verifique que los pendientes disminuyan y que los IDs aparezcan en Google Sheets.

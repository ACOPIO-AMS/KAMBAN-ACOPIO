# KANBAN CIRCUITO ACOPIO 0002.9.10

## Archivos de actualización

- `APPS_SCRIPT/INGRESO_DE_DATOS.gs`: backend completo. La revisión que declara en `ping` es `0002.9.10`. La revisión del backend y la app siguen en `0002.9.10`; se actualizó el control de concurrencia del backend y la clave de caché, sin cambiar la versión visible. El campo `version` permanece en `0002.9.0` para conservar compatibilidad con aplicaciones anteriores.
- `index.html`, `js/`, `css/`, `icons/`, `manifest.json` y `service-worker.js`: frontend completo. La URL fija es la implementación «NUEVA» proporcionada por el usuario, que empieza `AKfycbx_Uwdi` y termina `A0gX-o`.
- `PRUEBAS/integration.js`: prueba local de contrato, guardado en lote, tiempos, duplicados, recurso, cola, respaldo, reporte y captura de cinco dígitos. Solo para ejecutar en Node; no forma parte de los archivos web que se publican.

## Orden de actualización

1. Conserve los registros locales del celular; no borre los datos del navegador ni desinstale la PWA. Exporte un CSV desde Administrador si desea una copia adicional.
2. En el proyecto Apps Script, reemplace el contenido de `INGRESO DE DATOS.gs` con `APPS_SCRIPT/INGRESO_DE_DATOS.gs`. Los archivos `ACTUALIZA KAMBAN.gs` y `calculo tiempos.gs` no fueron suministrados para esta auditoría. Revise esos archivos: en todo el proyecto debe existir **solo un `function doGet` y un `function doPost`**. No elimine otras funciones ni activadores sin revisarlos.
3. Guarde y edite la implementación **«NUEVA»**: seleccione **Nueva versión** y pulse **Implementar**. Compruebe que conserva el mismo ID de implementación.
4. Abra `https://script.google.com/macros/s/AKfycbx_UwdiDhTvcWVAdygIIGh4otJXp22aFHFQ2t5QLJUySxDZBs_lh9ER0la_aA0gX-o/exec?action=ping`. Debe devolver `ok:true`, `version:"0002.9.0"`, `revision:"0002.9.10"` y `build:"cola-estable-1"` y `tiempos_base:true`. Si solo devuelve la versión antigua, no publique aún el frontend: la implementación no está ejecutando este backend.
5. Publique los archivos web del directorio `kanban_290_ligero` en el repositorio. La cabecera debe indicar `0002.9.10`. En el celular abra la app con conexión y use Administrador → **PROBAR RED Y SINCRONIZACIÓN**. Confirme que disminuyan los pendientes y que aparezcan en la hoja los registros y tiempos I:L.

## Reglas de datos

El código nuevo se registra con exactamente cinco dígitos, tanto con entrada manual como con escáner. El recurso inicial se hereda de los eventos locales anteriores para la misma estación y código. El backend acepta registros antiguos pendientes de versiones previas sin cambiar su código. En la fila `FINAL`, las columnas I:L contienen **ESPERA**, **PARADAS**, **PROCESO EFECTIVO** y **PERMANENCIA** en `hh:mm:ss`. Si falta un evento necesario, el cálculo queda vacío. Los cálculos usan los últimos 2000 renglones de cada estación.

## Alcance de las pruebas

Las pruebas automatizadas se ejecutaron con una hoja y una respuesta Apps Script simuladas en memoria. No se pudo consultar la implementación `/exec` ni escribir en la hoja real desde este entorno. Los otros dos archivos `.gs` del proyecto no están disponibles, por lo que no se pudo comprobar si definen `doGet`/`doPost` ni si interfieren con esta implementación.

## Corrección de «Base ocupada»

El envío se divide en lotes de dos registros y espera hasta 45 segundos la respuesta. El registro de estado de los equipos usa un bloqueo independiente para no competir con los guardados; el lote puede esperar 15 segundos y confirma los cambios antes de liberar el bloqueo. Los pendientes permanecen locales si la base continúa ocupada y se reintentan. Actualice primero el backend en el proyecto nuevo como **nueva versión de la misma implementación**, verifique que el ping muestre `build:"cola-estable-1"` y después publique los archivos web.

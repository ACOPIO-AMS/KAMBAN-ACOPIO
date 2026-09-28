# KANBAN CIRCUITO ACOPIO 0002.9.10

## Archivos de actualización

- `APPS_SCRIPT/INGRESO_DE_DATOS.gs`: backend completo. La revisión que declara en `ping` es `0002.9.10`. La revisión del backend y la app siguen en `0002.9.10`; se actualizó el control de concurrencia del backend y la clave de caché, sin cambiar la versión visible. El campo `version` permanece en `0002.9.0` para conservar compatibilidad con aplicaciones anteriores.
- `index.html`, `js/`, `css/`, `icons/`, `manifest.json` y `service-worker.js`: frontend completo. La URL fija es la implementación «NUEVA» proporcionada por el usuario, que empieza `AKfycbx_Uwdi` y termina `A0gX-o`.
- `PRUEBAS/integration.js`: prueba local de contrato, guardado en lote, tiempos, duplicados, recurso, cola, respaldo, reporte y captura de cinco dígitos. Solo para ejecutar en Node; no forma parte de los archivos web que se publican.

## Orden de actualización

1. Conserve los registros locales del celular; no borre los datos del navegador ni desinstale la PWA. Exporte un CSV desde Administrador si desea una copia adicional.
2. En el proyecto Apps Script, reemplace el contenido de `INGRESO DE DATOS.gs` con `APPS_SCRIPT/INGRESO_DE_DATOS.gs`. Los archivos `ACTUALIZA KAMBAN.gs` y `calculo tiempos.gs` no fueron suministrados para esta auditoría. Revise esos archivos: en todo el proyecto debe existir **solo un `function doGet` y un `function doPost`**. No elimine otras funciones ni activadores sin revisarlos.
3. Guarde y edite la implementación **«NUEVA»**: seleccione **Nueva versión** y pulse **Implementar**. Compruebe que conserva el mismo ID de implementación.
4. Abra `https://script.google.com/macros/s/AKfycbx_UwdiDhTvcWVAdygIIGh4otJXp22aFHFQ2t5QLJUySxDZBs_lh9ER0la_aA0gX-o/exec?action=ping`. Debe devolver `ok:true`, `version:"0002.9.0"`, `revision:"0002.9.10"` y `build:"inventario-tabla-6"`, `tiempos_base:true` e `inventario:true`. Si no aparece esta compilación, la implementación aún no ejecuta el backend corregido.
5. Publique los archivos web del directorio `kanban_290_ligero` en el repositorio. La cabecera debe indicar `0002.9.10`. En el celular abra la app con conexión y use Administrador → **PROBAR RED Y SINCRONIZACIÓN**. Confirme que disminuyan los pendientes y que aparezcan en la hoja los registros y el bloque de tiempos (I:L si está libre; en otras columnas si ya existe contenido).

## Reglas de datos

El código nuevo se registra con exactamente cinco dígitos, tanto con entrada manual como con escáner. El recurso inicial se hereda de los eventos locales anteriores para la misma estación y código. El backend acepta registros antiguos pendientes de versiones previas sin cambiar su código. En la fila `FINAL`, el bloque **ESPERA**, **PARADAS**, **PROCESO EFECTIVO** y **PERMANENCIA** contiene los tiempos en `hh:mm:ss`. Si la hoja ya usa columnas desde I, el bloque se agrega después de la última columna ocupada y conserva el contenido anterior. Si ya existe un bloque de tiempos, se reutiliza. Si falta un evento necesario, el cálculo queda vacío. Los cálculos usan los últimos 2000 renglones de cada estación.

## Alcance de las pruebas

Las pruebas automatizadas se ejecutaron con una hoja y una respuesta Apps Script simuladas en memoria. No se pudo consultar la implementación `/exec` ni escribir en la hoja real desde este entorno. Los otros dos archivos `.gs` del proyecto no están disponibles, por lo que no se pudo comprobar si definen `doGet`/`doPost` ni si interfieren con esta implementación.

## Corrección de «Base ocupada»

El envío se divide en lotes de dos registros y espera hasta 45 segundos la respuesta. El registro de estado de los equipos usa un bloqueo independiente para no competir con los guardados; el lote puede esperar 15 segundos y confirma los cambios antes de liberar el bloqueo. El cálculo de tiempos lee cada estación una vez por lote, incluso si contiene varios códigos. Los pendientes permanecen locales si la base continúa ocupada y se reintentan. Actualice primero el backend en el proyecto nuevo como **nueva versión de la misma implementación**, verifique que el ping muestre `build:"inventario-tabla-6"` y después publique los archivos web del paquete; el número visible permanece en 0002.9.10. Los registros pendientes permanecen guardados en cada dispositivo. El error confirmado en MUESTREO se debía a encabezados existentes en I:L.

## Envío ligero

El navegador codifica cada registro pendiente como ocho valores en orden fijo: código, evento, fecha/hora, operario, estación, recurso, detalle e ID. No transmite indicadores de cálculo ni campos locales de control, ya que el servidor los calcula. El backend acepta tanto este formato como los objetos anteriores para permitir que otros celulares sigan sincronizando mientras actualizan la app. Los lotes siguen siendo de dos registros; el reintento tras base ocupada se distribuye en el tiempo para evitar que todos los equipos repitan a la vez. Los encabezados de cada hoja se preparan una vez y se reutiliza la configuración durante diez minutos.

## INVENTARIO

En Estación seleccione INVENTARIO, elija la serie A, B o C y el número de cancha del 1 al 8 en las listas, indique el operador y lea el código alfanumérico largo. Termine la lectura con Enter del escáner o el botón REGISTRAR LECTURA DE INVENTARIO; la longitud es variable y no se registra automáticamente al quinto carácter. La app obtiene el lote con los últimos cinco caracteres, equivalente a `DERECHA(código,5)`. El registro queda en la cola local y se confirma por ID antes de considerarse sincronizado.

La pestaña **INVENTARIO** del mismo libro recibe filas bajo sus encabezados existentes, sin alterar la tabla: A CODIGO = lectura completa; B N° LOTE = últimos cinco caracteres; C FECHA Y HORA; D RECURSO = serie-número (A-5); E OPERARIO; F ID REGISTRO. El backend reconoce los encabezados A:F entre las primeras diez filas y agrega filas después del último registro. Si no reconoce esa estructura, informa un error y conserva el pendiente local sin escribir en la hoja. Administrador muestra la compilación real del backend después de consultar el ping. La tabla «Pendientes por finalizar» ahora muestra Recurso; las lecturas de inventario no entran a esa lista porque no requieren evento FINAL.

La serie, cancha y operador de INVENTARIO se conservan en este dispositivo hasta que el usuario los edite. En Registros locales, Evento muestra el número de lote (últimos cinco caracteres); internamente la lectura conserva el tipo LECTURA para que el backend la guarde en la tabla INVENTARIO. La cola histórica puede enviar vacía la columna RECURSO cuando ese registro no la tenía; el formulario de captura nuevo mantiene los requisitos específicos de cada estación.

Si Administrador todavía muestra `Backend: inventario-tabla-4`, la implementación publicada sigue ejecutando el script anterior. Actualizar el archivo local o GitHub no actualiza Apps Script: edite la implementación existente con una **nueva versión** y confirme `build:"inventario-tabla-6"` en `/exec?action=ping`. El mensaje «Base ocupada» significa que el bloqueo de escritura no estuvo disponible; si persiste después de publicar esta compilación, revise las ejecuciones simultáneas del proyecto Apps Script. Las pruebas de este paquete no verifican el Google Sheets real.

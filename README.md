# KANBAN CIRCUITO ACOPIO 0002.9.10

## Archivos de actualización

- `APPS_SCRIPT/INGRESO_DE_DATOS.gs`: backend completo. La revisión que declara en `ping` es `0002.9.10`. La revisión del backend y la app siguen en `0002.9.10`; se actualizó el control de concurrencia del backend y la clave de caché, sin cambiar la versión visible. El campo `version` permanece en `0002.9.0` para conservar compatibilidad con aplicaciones anteriores.
- `index.html`, `js/`, `css/`, `icons/`, `manifest.json` y `service-worker.js`: frontend completo. La URL fija es la implementación «NUEVA» proporcionada por el usuario, que empieza `AKfycbx_Uwdi` y termina `A0gX-o`.
- `PRUEBAS/integration.js`: prueba local de contrato, guardado en lote, tiempos, duplicados, recurso, cola, respaldo, reporte y captura de cinco dígitos. Solo para ejecutar en Node; no forma parte de los archivos web que se publican.

## Orden de actualización

1. Conserve los registros locales del celular; no borre los datos del navegador ni desinstale la PWA. Exporte un CSV desde Administrador si desea una copia adicional.
2. En el proyecto Apps Script, reemplace el contenido de `INGRESO DE DATOS.gs` con `APPS_SCRIPT/INGRESO_DE_DATOS.gs`. Los archivos `ACTUALIZA KAMBAN.gs` y `calculo tiempos.gs` no fueron suministrados para esta auditoría. Revise esos archivos: en todo el proyecto debe existir **solo un `function doGet` y un `function doPost`**. No elimine otras funciones ni activadores sin revisarlos.
3. Guarde y edite la implementación **«NUEVA»**: seleccione **Nueva versión** y pulse **Implementar**. Compruebe que conserva el mismo ID de implementación.
4. Abra `https://script.google.com/macros/s/AKfycbx_UwdiDhTvcWVAdygIIGh4otJXp22aFHFQ2t5QLJUySxDZBs_lh9ER0la_aA0gX-o/exec?action=ping`. Debe devolver `ok:true`, `version:"0002.9.0"`, `revision:"0002.9.10"` y `build:"inventario-tabla-12"`, `tiempos_base:true` e `inventario:true`. Si no aparece esta compilación, la implementación aún no ejecuta el backend corregido.
5. Publique los archivos web del directorio `kanban_290_ligero` en el repositorio. La cabecera debe indicar `0002.9.10`. En el celular abra la app con conexión y use Administrador → **PROBAR RED Y SINCRONIZACIÓN EN ESTE EQUIPO**. Confirme que disminuyan los pendientes y que aparezcan en la hoja los registros y el bloque de tiempos (I:L si está libre; en otras columnas si ya existe contenido).

## Reglas de datos

El código nuevo se registra con exactamente cinco dígitos, tanto con entrada manual como con escáner. El recurso inicial se hereda de los eventos locales anteriores para la misma estación y código. El backend acepta registros antiguos pendientes de versiones previas sin cambiar su código. En la fila `FINAL`, el bloque **ESPERA**, **PARADAS**, **PROCESO EFECTIVO** y **PERMANENCIA** contiene los tiempos en `hh:mm:ss`. Si la hoja ya usa columnas desde I, el bloque se agrega después de la última columna ocupada y conserva el contenido anterior. Si ya existe un bloque de tiempos, se reutiliza. Si falta un evento necesario, el cálculo queda vacío. Los cálculos usan los últimos 2000 renglones de cada estación.

## Alcance de las pruebas

Las pruebas automatizadas se ejecutaron con una hoja y una respuesta Apps Script simuladas en memoria. No se pudo consultar la implementación `/exec` ni escribir en la hoja real desde este entorno. Los otros dos archivos `.gs` del proyecto no están disponibles, por lo que no se pudo comprobar si definen `doGet`/`doPost` ni si interfieren con esta implementación.

## Corrección de «Base ocupada»

El envío se divide en lotes de hasta ocho registros y espera hasta 45 segundos la respuesta. El registro de estado de los equipos usa un bloqueo independiente para no competir con los guardados; el lote puede esperar 15 segundos y confirma los cambios antes de liberar el bloqueo. El cálculo de tiempos lee cada estación una vez por lote, incluso si contiene varios códigos. Los pendientes permanecen locales si la base continúa ocupada y se reintentan. Actualice primero el backend en el proyecto nuevo como **nueva versión de la misma implementación**, verifique que el ping muestre `build:"inventario-tabla-12"` y después publique los archivos web del paquete; el número visible permanece en 0002.9.10. Los registros pendientes permanecen guardados en cada dispositivo. El error confirmado en MUESTREO se debía a encabezados existentes en I:L.

## Envío ligero

El navegador codifica cada registro pendiente como ocho valores en orden fijo: código, evento, fecha/hora, operario, estación, recurso, detalle e ID. No transmite indicadores de cálculo ni campos locales de control, ya que el servidor los calcula. El backend acepta tanto este formato como los objetos anteriores para permitir que otros celulares sigan sincronizando mientras actualizan la app. Los lotes tienen hasta ocho registros y se dividen si la URL supera el límite seguro; el reintento tras base ocupada se distribuye en el tiempo para evitar que todos los equipos repitan a la vez. Los encabezados de cada hoja se preparan una vez y se reutiliza la configuración durante diez minutos.

## INVENTARIO

En Estación seleccione INVENTARIO, elija la serie A, B o C y el número de cancha del 1 al 8 en las listas, e indique el operador. Puede escribir exactamente cinco dígitos cuando no tenga el QR: `22525` se guarda como código `PPO22525` y lote `22525`. También puede leer la cadena alfanumérica larga: la app busca dentro de ella un único patrón `PPO` seguido de cinco dígitos (admite `PP0` cuando el escáner confunde la letra O con el cero). Por ejemplo, `20Set0627PPO68843101240MINERA68843` produce `PPO68843` y lote `68843`. Termine con Enter o el botón REGISTRAR LECTURA DE INVENTARIO. Una lectura larga sin ese patrón, o con dos códigos PPO distintos, queda sin registrar para revisión. El registro queda en la cola local y se confirma por ID antes de considerarse sincronizado.

La pestaña **INVENTARIO** del mismo libro recibe filas bajo sus encabezados existentes, sin alterar la tabla: A CODIGO = `PPO` y sus cinco dígitos; B N° LOTE = esos cinco dígitos; C FECHA Y HORA; D RECURSO = serie-número (A-5); E OPERARIO; F ID REGISTRO. El backend reconoce los encabezados A:F entre las primeras diez filas y agrega filas después del último registro. Si no reconoce esa estructura, informa un error y conserva el pendiente local sin escribir en la hoja. Administrador muestra la compilación real del backend después de consultar el ping. La tabla «Pendientes por finalizar» ahora muestra Recurso; las lecturas de inventario no entran a esa lista porque no requieren evento FINAL.

La serie, cancha y operador de INVENTARIO se conservan en este dispositivo hasta que el usuario los edite. En Registros locales, Evento muestra el número de lote, leído o digitado; internamente conserva el tipo LECTURA para que el backend lo guarde en la tabla INVENTARIO. La cola histórica puede enviar vacía la columna RECURSO cuando ese registro no la tenía; el formulario de captura nuevo mantiene los requisitos específicos de cada estación.

Si Administrador todavía muestra `Backend: inventario-tabla-4`, la implementación publicada sigue ejecutando el script anterior. Actualizar el archivo local o GitHub no actualiza Apps Script: edite la implementación existente con una **nueva versión** y confirme `build:"inventario-tabla-12"` en `/exec?action=ping`. El mensaje «Base ocupada» significa que el bloqueo de escritura no estuvo disponible; si persiste después de publicar esta compilación, revise las ejecuciones simultáneas del proyecto Apps Script. Las pruebas de este paquete no verifican el Google Sheets real.

## Reintento en todos los equipos

En Administrador pulse **SOLICITAR REINTENTO EN TODOS LOS EQUIPOS**. El backend guarda una señal pequeña; la app instalada en cada equipo la consulta al abrir y en su reporte periódico (aproximadamente cada minuto) y vuelve a intentar los pendientes de ese equipo. Si el equipo desde el que se solicita está sin internet, la solicitud queda en ese navegador hasta que recupere la conexión. Si otro equipo está sin internet o la app está cerrada, recibirá la señal cuando abra la app y pueda conectar con Apps Script. El botón **PROBAR RED Y SINCRONIZACIÓN EN ESTE EQUIPO** reintenta solo los pendientes locales. Debajo de los botones se muestra el motivo del último intento de hasta 30 registros pendientes de este equipo.

Esta orden no transporta los registros de un equipo a otro ni puede enviar datos desde un equipo apagado. Tampoco soluciona por sí sola una implementación antigua, un servidor sin respuesta o un registro rechazado por la base: se conserva el pendiente y se muestra el motivo; solo la confirmación del ID por el backend lo marca como sincronizado. El ping de esta compilación debe mostrar `build:"inventario-tabla-12"`, `revision:"0002.9.10"` y `sync_remota:true`.

## Actualización dirigida desde Administrador

1. Publique el backend de este paquete como **nueva versión de la implementación existente** y verifique en `/exec?action=ping` `build:"inventario-tabla-12"`, `actualizacion_remota:true` y `sync_remota:true`.
2. Publique todos los archivos web, incluido `service-worker.js`, manteniendo su URL. En el móvil administrador abra la nueva app. **FORZAR ACTUALIZACIÓN DE LA APP EN TODOS LOS EQUIPOS** guarda la orden en Apps Script. Cada dispositivo que tenga esta compilación consulta esa orden al abrir y aproximadamente cada minuto mientras esté abierto y conectado, comprueba el service worker publicado y recarga cuando se instala la nueva versión. En CONTROL DE EQUIPOS la compilación aparece como `0002.9.10-inventario-manual`.
3. **SOLICITAR REINTENTO EN TODOS LOS EQUIPOS** es una orden distinta: cada dispositivo reintenta su propia cola local. No borre los datos del navegador ni desinstale la PWA para actualizar. Si el servidor está inaccesible, la orden que aún no recibió el servidor queda pendiente en el móvil que la emitió.

Esta es una orden diferida, no una acción instantánea sobre equipos apagados, sin internet o con la app cerrada. Los clientes anteriores a esta compilación necesitan cargarla por primera vez mediante la actualización habitual al abrir la app; solo entonces reconocerán la orden remota. La publicación de una actualización web y del backend sigue siendo necesaria antes de pulsar el botón. La prueba automatizada simula el protocolo y una hoja en memoria; no certifica que los dispositivos reales ni el Google Sheets hayan recibido datos.

## Confirmación por equipo

La tabla CONTROL DE EQUIPOS muestra Compilación, Actualización y Transferencia para cada dispositivo. «Esperando conexión o respuesta» significa que la orden existe pero ese equipo todavía no confirmó haberla atendido. «Revisión de versión realizada» confirma que consultó la actualización; compruebe además la columna Compilación para verificar que realmente instaló el código nuevo. «Transferencia terminada; 0 pendientes» confirma que ese equipo agotó su cola. Si queda un número de pendientes, el motivo queda en Transferencia u Observación. La orden no mueve los registros de un equipo a otro; se guardan y reintentan en su dispositivo original.

## Envío con conectividad limitada y paradas de DESCARGUIO

La cola local registra cada lectura inmediatamente; espera 700 ms para reunir lecturas consecutivas antes de transmitir. Envía hasta ocho registros compactos por petición; divide un lote cuando códigos largos de inventario producirían una URL superior a 1400 caracteres de carga. Si no hay pendientes, la revisión periódica no hace `ping` a Apps Script. La señal remota se consulta con una respuesta ligera cada minuto; el reporte completo de equipos se envía aproximadamente cada tres minutos y tras una transferencia. Los registros solo se marcan como sincronizados cuando el backend confirma su ID.

DESCARGUIO admite INICIO → PARADA → REINICIO (repetible) → FINAL. La lectura normal después de PARADA registra REINICIO. El tiempo de PARADAS suma cada tramo PARADA–REINICIO, y PROCESO EFECTIVO = FINAL − INICIO − PARADAS, tanto en Registros locales como en la fila FINAL de la base. En la estación INVENTARIO se oculta el panel «Pendientes por finalizar»; reaparece en las demás estaciones.

## Corrección de inventario histórico

Después de actualizar el backend, ejecute `REVISAR_INVENTARIO_PPO` en el editor de Apps Script y examine el resultado en el registro de ejecución. Muestra la cantidad de filas corregibles y hasta cinco ejemplos; no modifica nada. Luego ejecute `CORREGIR_INVENTARIO_PPO`: copia la hoja completa en una pestaña `INVENTARIO_RESPALDO_<fecha>` y cambia únicamente las columnas A y B de las filas que tienen un único código PPO. No altera filas sin patrón claro; `sinPatron` indica cuántas requieren revisión manual. Esta acción se hace una sola vez, desde su proyecto de Apps Script. Los registros pendientes antiguos también se normalizan al sincronizar con este paquete; la lectura completa permanece en el registro local. No se puede corregir una hoja remota sin ejecutar esta función en el proyecto con acceso al libro.

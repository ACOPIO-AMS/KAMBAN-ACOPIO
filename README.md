# KANBAN CIRCUITO ACOPIO V0002.9.7

## Cambios
- La tabla «Registros locales» muestra espera, paradas, proceso efectivo y permanencia en la fila FINAL. Se eliminó la tabla separada de tiempos.
- Apps Script añade I ESPERA, J PARADAS, K PROCESO EFECTIVO y L PERMANENCIA en cada hoja de estación. Escribe hh:mm:ss en la fila FINAL y recalcula si llega otro evento del mismo código después.
- El recálculo examina las últimas 2000 filas de cada estación para el código afectado; los ciclos anteriores a ese tramo no se reconstruyen automáticamente.
- El administrador permite buscar por código, evento, operador, fecha, estación o recurso, filtrar estación y seleccionar registros visibles sin perder selecciones al cambiar de filtro. El borrado mantiene el límite de 50 por bloque y la confirmación.
- En Administrador se muestra el motivo si la sincronización falla. «PROBAR RED Y SINCRONIZACIÓN» vuelve a intentar también los registros que versiones anteriores dejaron bloqueados. Los errores del servidor no bloquean definitivamente los registros.
- Se conservan el código de cinco dígitos, el registro inmediato, el recurso heredado y PATIO de las versiones anteriores.

## Cálculos
Espera = INICIO − RECEPCIÓN. Paradas = suma de REINICIO − PARADA. Proceso efectivo = FINAL − INICIO − paradas. Permanencia = FINAL − RECEPCIÓN. En MUESTREO, SALIDA STOCK actúa como inicio si no existe INICIO. Sin RECEPCIÓN la espera y permanencia quedan vacías. Una parada sin reinicio no produce tiempo efectivo válido.

## Instalación
1. Copie `APPS_SCRIPT/INGRESO_DE_DATOS.gs` al proyecto de Apps Script y actualice su implementación existente, conservando la URL. Hágalo antes de subir la interfaz: la nueva app verifica que el backend admita los tiempos; si todavía no está actualizado, los registros permanecen locales y pendientes de sincronizar.
2. Reemplace los archivos web por los de esta carpeta. Compruebe que el encabezado muestre 0002.9.7. No borre los datos del navegador: incluyen registros pendientes. Entre a Administrador y pulse «PROBAR RED Y SINCRONIZACIÓN»; el mensaje «Motivo» indica el error específico si la base rechaza el envío.
3. Compruebe I:L en una hoja de estación. Si ya hay otros encabezados allí, el servidor detendrá el guardado de tiempos y avisará para evitar sobrescribirlos.

El backend mantiene la respuesta de versión 0002.9.0 para que los celulares con la interfaz anterior sigan sincronizando mientras se actualizan. La nueva app comprueba adicionalmente la capacidad `tiempos_base`.

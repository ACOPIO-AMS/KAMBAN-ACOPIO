# KANBAN CIRCUITO ACOPIO V0002.9.5

## Tiempos de proceso
La tabla «Tiempos por lote y estación» usa los eventos guardados en el dispositivo. Muestra espera (INICIO − RECEPCIÓN), paradas acumuladas (REINICIO − PARADA), proceso efectivo (FINAL − INICIO − paradas) y permanencia (FINAL − RECEPCIÓN). Las duraciones se presentan en hh:mm:ss. La espera queda «—» en estaciones sin RECEPCIÓN. En MUESTREO, SALIDA STOCK hace de inicio si no hay otro INICIO. Los eventos faltantes o tiempos fuera de orden quedan «—». No agrega columnas a Google Sheets.

## Cambios de esta versión
- Si el quinto dígito llega antes de completar operador, recurso, mineral, ubicación o motivo de stock, el código se conserva y la pantalla indica el dato faltante. Al completarlo se guarda el evento sin escanear otra vez.
- El campo bloquea letras, símbolos y más de cinco dígitos al escribir o pegar. Una lectura inválida se bloquea y no genera eventos.
- El código debe tener exactamente cinco dígitos numéricos. El quinto dígito dispara el registro inmediatamente, tanto en digitación manual como en escaneo.
- En DESCARGUIO, CHANCADO, SECADO y PULVERIZADO el primer evento pide recurso; los siguientes del mismo código y estación reutilizan el recurso guardado en este dispositivo. El selector muestra el recurso recuperado.
- DESCARGUIO incluye PATIO como recurso.
- El motivo de EN STOCK se despliega debajo de los botones de modo y recibe el foco al seleccionar EN STOCK.
- Esta versión cambia solo la interfaz. El Apps Script incluido es el backend 2.9.0, compatible con esta actualización; no requiere nueva implementación del backend.

## Instalación
Reemplace los archivos de la web con el contenido de esta carpeta. Conserve los datos locales del navegador para mantener el historial y la cola pendiente de sincronización. La caché de la app cambia a 0002.9.5-ligero.

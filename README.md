# KANBAN CIRCUITO ACOPIO V0002.9.2

## Cambios de esta versión
- El campo bloquea letras, símbolos y más de cinco dígitos al escribir o pegar. Una lectura inválida cancela el registro automático hasta corregir el campo.
- El código debe tener exactamente cinco dígitos numéricos. El escáner registra tras una pausa breve de 300 ms para recibir una lectura completa. La digitación manual espera cinco segundos desde la última modificación.
- En DESCARGUIO, CHANCADO, SECADO y PULVERIZADO el primer evento pide recurso; los siguientes del mismo código y estación reutilizan el recurso guardado en este dispositivo. El selector muestra el recurso recuperado.
- DESCARGUIO incluye PATIO como recurso.
- El motivo de EN STOCK se despliega debajo de los botones de modo y recibe el foco al seleccionar EN STOCK.
- La versión 2.9.1 cambia solo la interfaz. El Apps Script incluido es el backend 2.9.0, compatible con esta actualización; no requiere nueva implementación del backend.

## Instalación
Reemplace los archivos de la web con el contenido de esta carpeta. Conserve los datos locales del navegador para mantener el historial y la cola pendiente de sincronización. La caché de la app cambia a 0002.9.2-ligero.

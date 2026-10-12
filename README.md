KANBAN QR 3.0 - R9 MOTIVO DE STOCK

Basado en el paquete R8, sin cambios en backend ni sincronización.
En DESCARGUÍO se muestra MOTIVO DE STOCK cuando el recurso es PATIO o se activa EN STOCK.
Opciones: LOTE HÚMEDO, ESPERANDO PROVEEDOR, CIRCUITO OCUPADO, CLIMA.
El motivo es obligatorio para esos casos y se envía en DETALLE (columna H).
En PATIO, al registrar FINAL, se genera también EN STOCK con ID propio y el mismo motivo.
Tras cada registro se limpian recurso y motivo; estación y operario permanecen.
INVENTARIO conserva su ubicación fija. No se cambió el backend.

Subir el contenido de este ZIP a la raíz del repositorio GitHub.
No borrar almacenamiento del navegador ni pendientes de los equipos.

PRUEBAS: sintaxis JS y estructura ZIP verificadas. No se ha probado escritura real en Google Sheets.

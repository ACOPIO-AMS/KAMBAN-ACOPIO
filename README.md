# KAMBAN ACOPIO V2 PRODUCCIÓN

Repositorio: https://github.com/ACOPIO-AMS/KAMBAN-ACOPIO.git

## Auditoría general aplicada
- Código separado por módulos para evitar conflictos del index gigante.
- Sincronización corregida: ya no reemplaza toda la base local, solo marca por ID.
- Borrado automático eliminado. Solo existe borrado manual desde ADMIN.
- Kanban preparado para alimentarse desde Google Sheets/Drive mediante Apps Script `action=list`.
- Si no hay internet, Kanban usa base local como respaldo.
- Secuencias limpias por estación.

## Subir a GitHub
Subir todo el contenido de esta carpeta a la raíz del repositorio.

Luego activar Pages:
Settings > Pages > Deploy from branch > main > /root.

URL:
https://ACOPIO-AMS.github.io/KAMBAN-ACOPIO/

# KANBAN CIRCUITO ACOPIO V0002.8.3

Versión de producción.

## Cambios
- BALANZA: tipo de mineral obligatorio (MINERAL, LLAMPO, POLVILLO, CHANCADO, ESPECIAL, REINGRESO).
- CANCHA: ubicación A/B/C con posiciones 1–8; PLANTA sin numeración.
- ADMIN: borrado por bloques de máximo 50 registros.
- Limpieza automática: finalizados sincronizados con más de 20 días, máximo 50 por ejecución.
- Confirmación de borrado seleccionados visible arriba de la tabla.
- Estación y recurso/equipo permanecen en la misma fila también en móvil.

## IMPORTANTE
Además de subir los archivos a GitHub, copie el contenido actualizado de `APPS_SCRIPT/INGRESO_DE_DATOS.gs` en el proyecto de Apps Script y actualice la implementación existente para conservar la misma URL.


## Versión 0002.8.3
- BALANZA guarda el tipo de mineral directamente en RECURSO.
- CANCHA guarda la ubicación directamente en RECURSO.
- No se agregan columnas nuevas al Google Sheets.


## V0002.8.3
- BALANZA guarda el tipo de mineral en RECURSO.
- MUESTREO guarda la ubicación en RECURSO: 1-8 + A/B/C, o PLANTA sin numeración.
- Los selectores operativos se muestran al costado de Estación.


## V0002.8.3
- Nombre de la app corregido a KANBAN.
- Reportes lee directamente la hoja KANBAN de Google Sheets.

# KANBAN QR 3.0 — sincronización ligera r3

## IMPORTANTE: proteger registros pendientes
No eliminar caché, datos del navegador ni reinstalar la PWA. El repositorio GitHub no contiene los pendientes; cada equipo los conserva localmente.

## Publicación
1. Cargar **el contenido** de este directorio a la raíz de GitHub Pages (index.html en la raíz).
2. En el proyecto de Google Apps Script conectado a la hoja, sustituir el código antiguo por el archivo completo `backend/INGRESO_DE_DATOS_KANBAN_V3_0.gs`. **No copiar el .gs a GitHub esperando que se ejecute: GitHub solo lo almacena.**
3. Guardar e implementar una **nueva versión de la implementación existente**. Conservar URL /exec y acceso necesario para todos los equipos.
4. Verificar `.../exec?action=ping` y que responda build `v3.0-sync-ligero-r3`.
5. Probar un registro nuevo y después reintentar los pendientes de cada dispositivo. Comprobar los IDs en Sheets.

## Cambios de esta revisión
- Quita la escritura masiva de formatos de columnas del camino crítico de guardado.
- El cálculo de tiempos se difiere a `RECALCULAR_TIEMPOS_MANUAL()` para que no frene las colas de varios usuarios. **Esto implica que los indicadores I:L NO se actualizan automáticamente durante el guardado**; ejecutar manualmente fuera de las horas de mayor carga o implementar un trigger periódico de baja frecuencia una vez verificada la transferencia.
- `CONFIGURAR_FORMATO_TIEMPOS()` aplica el formato numérico en minutos por separado.
- Una estación con error no impide responder por ID sobre las otras estaciones del mismo lote.
- Se elimina el ping extra antes de cada envío.

## Limitaciones
No se ha probado contra la implementación de Apps Script y la hoja de producción: el comportamiento final requiere validar la implementación desplegada, permisos, límites y IDs confirmados. Mantener un respaldo del backend actual antes de sustituirlo.

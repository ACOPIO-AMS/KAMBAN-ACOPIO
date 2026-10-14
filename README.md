KANBAN QR 3.0 R15 — PENDIENTES EN STOCK

Cambio ÚNICO de lógica: js/reglas.js / pendientesPorFinalizar().
- Si el último movimiento de stock de un código/estación es EN STOCK, permanece en Pendientes por finalizar con Falta = SALIDA STOCK, incluso si tiene FINAL.
- Cuando se registra SALIDA STOCK, desaparece de Pendientes.
- Los lotes sin stock siguen apareciendo hasta FINAL como antes.
- La lista sigue ordenada por la última fecha/hora registrada.
- Se actualiza la versión de caché del frontend para que los móviles carguen la corrección.

No se modifican registros, sincronización, cálculos de tiempos, backend, recursos ni datos guardados.
No borrar caché ni almacenamiento local de los equipos.
Limitación: el panel usa registros locales del dispositivo; para mostrar stock de otros equipos se requeriría consulta compartida.

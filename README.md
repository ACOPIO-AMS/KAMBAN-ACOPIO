KANBAN QR 3.0 R12 — Motivo de stock en RECURSO

DESCARGUIO: PATIO + LOTE HÚMEDO se registra en la columna F como PATIO - LOTE HÚMEDO.
INICIO: solicita motivo solo una vez cuando el recurso es PATIO.
FINAL: hereda el recurso completo de INICIO; si PATIO genera EN STOCK con ID independiente.
EN STOCK automático: hereda recurso completo sin pedir motivo.
EN STOCK manual: solicita motivo solamente si no existe motivo previo; con otra tolva registra T1 - CIRCUITO OCUPADO, por ejemplo.
DETALLE: conserva el motivo por compatibilidad con los registros existentes.
RECEPCION: no exige recurso. INVENTARIO: ubicación persistente.
No se modificó backend ni claves de almacenamiento, ni se alteraron cálculos.
LIMITACIÓN: el INICIO debe estar registrado localmente en el mismo equipo para heredar recurso/motivo.
Los registros históricos no se reescriben.
Instalación: reemplazar los archivos de GitHub con los del ZIP; conservar datos locales.

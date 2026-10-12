KANBAN QR 3.0 R14 — SOLO TRANSFERENCIA DE TIEMPOS

Se conserva la versión R13 de recursos, eventos, diseño y cálculos locales.
El frontend envía junto a cada registro 4 tiempos en minutos: espera, paradas, proceso y permanencia.
El backend escribe directamente los valores recibidos en columnas I:L de la estación.
No se recalcula nada en Apps Script durante la transferencia.
PARADAS sin dato se envía y escribe vacío. No se obliga a tener tiempos para enviar.
Los registros con estado OK ya enviados no se reenvían ni se modifican.
El cálculo existente del frontend solo produce métricas en el evento FINAL.
INSTALACION: reemplazar contenido del ZIP en GitHub y actualizar la MISMA implementación de Apps Script con backend/INGRESO_DE_DATOS_KANBAN_V3_0.gs.
No ejecutar INSTALAR_CALCULO_AUTOMATICO(). Si existe un activador anterior RECALCULAR_TIEMPOS_AUTOMATICO, desactivarlo manualmente para cumplir 'sin recálculo'.
No borrar almacenamiento local ni registros pendientes.
PRUEBAS: sintaxis y contrato de datos; no se probó escritura contra la hoja real.

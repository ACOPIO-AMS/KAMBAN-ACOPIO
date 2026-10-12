KANBAN QR 3.0 - R4 (ajuste acotado)

Se conserva la sincronización ligera R3, endpoint, IDs y claves locales.

CAMBIOS:
- Limpieza de recurso/tolva/circuito/horno/molino/ubicación tras registro exitoso local.
- Estación y operario permanecen durante el turno 07:00-18:59 / 19:00-06:59; se reinician al cambiar de turno.
- Indicadores ESPERA, PARADAS, PROCESO y PERMANENCIA en minutos. PARADAS vacío sin eventos de parada.
- Recalculo automático por disparador de Apps Script cada minuto, sin bloquear la escritura de los móviles.

INSTALACIÓN:
1. Sustituir archivos de GitHub por el contenido de este ZIP, manteniendo index.html en raíz.
2. Reemplazar el código del proyecto Apps Script por backend/INGRESO_DE_DATOS_KANBAN_V3_0.gs.
3. Desde el editor de Apps Script, ejecutar UNA VEZ INSTALAR_CALCULO_AUTOMATICO() y conceder permisos.
4. Administrar implementaciones > Editar > Nueva versión > Implementar. Mantener la misma URL /exec.
5. Verificar ping build v3.0-recursos-tiempos-auto-r4 y comprobar un ID en Sheets.

ADVERTENCIA: No borrar datos/caché del navegador en ningún equipo con pendientes.
No se ha validado una transferencia real contra la hoja de producción.

R5: Inventario usa PPO 35335 (espacio) en pantalla, cola de sincronización y Google Sheets. Acepta registros anteriores PPO35335 y QR largos, normalizándolos al enviar. Sin otros cambios funcionales.

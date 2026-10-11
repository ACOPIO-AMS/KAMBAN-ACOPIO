from pathlib import Path
R=Path(__file__).resolve().parents[1]
read=lambda p:(R/p).read_text(encoding='utf-8')
idx=read('index.html'); cfg=read('js/config.js'); app=read('js/app.js'); rules=read('js/reglas.js'); sync=read('js/sincronizacion.js'); adm=read('js/admin.js'); xls=read('js/exportar_excel.js'); sw=read('service-worker.js'); be=read('backend/INGRESO_DE_DATOS_KANBAN_V3_0.gs')
checks={
 'version_frontend_3_0':'const APP_VERSION="3.0"' in cfg and 'Registro QR ver. 3.0' in idx,
 'cache_v3':'v3.0-auditoria-completa' in sw,
 'inventario_numero_primero':idx.index('id="inventarioNumero"') < idx.index('id="inventarioSegmento"'),
 'inventario_0_a_10':'id="inventarioNumero"' in idx and '<option>0</option>' in idx and '<option>10</option>' in idx,
 'muestreo_numero_primero':idx.index('id="muestreoNumero"') < idx.index('id="muestreoSegmento"'),
 'registro_3_A':'`${numero} ${segmento}`' in app and 'normalizarUbicacion' in sync,
 'qr_extenso_2048':'QR_INVENTARIO_MAX=2048' in cfg and 'QR_INVENTARIO_MAX' in app,
 'patio_final_stock':'recurso==="PATIO"&&evento==="FINAL"' in app and '"EN STOCK"' in app,
 'pendientes_recientes_primero':'String(b.ultimo).localeCompare(String(a.ultimo))' in rules,
 'inventario_retencion_2':'RETENCION_INVENTARIO_DIAS=2' in cfg and 'RETENCION_INVENTARIO_DIAS' in adm,
 'otras_retencion_20':'RETENCION_LOCAL_DIAS=20' in cfg,
 'nunca_borra_pendiente':'r.estacion==="INVENTARIO"&&r.sincronizado' in adm and 'rs.every(r=>r.sincronizado)' in adm,
 'lote_ligero_4':'SYNC_BATCH_SIZE=4' in cfg,
 'reintento_5_min':'SYNC_PERIODIC_MS=300000' in cfg,
 'fallback_individual':'enviarIndividual' in sync and 'save_batch' in sync,
 'confirmacion_ID':'ID no confirmado por servidor' in sync,
 'sin_bloqueo_version':'Backend incompatible' not in sync,
 'sin_bloqueo_inventario_global':'backend publicado aún no admite INVENTARIO' not in sync,
 'xlsx_real':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in xls and 'RESPALDO_KANBAN_' in xls,
 'backend_3_0':'var KA_VERSION="3.0"' in be and 'inventario:true' in be and 'save_batch' in be,
}
fall=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(('OK  ' if v else 'FAIL')+k)
if fall: raise SystemExit('FALLAS: '+', '.join(fall))
print(f'RESULTADO: {len(checks)}/{len(checks)} comprobaciones OK')

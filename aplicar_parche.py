#!/usr/bin/env python3
"""Aplicar corrección Kanban 2.9.12 en una copia local del repositorio.
No toca Apps Script desplegado ni la base local de los celulares.
Rechaza estructuras distintas en vez de arriesgar una modificación incorrecta.
"""
from pathlib import Path
import shutil
import sys

ROOT = Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
BUILD = '0002.9.12-operativo-ligero'
BASE = '0002.9.10-inventario-minutos'
SRC = Path(__file__).resolve().parent


def unica(cadena, anterior, nuevo, archivo):
    n = cadena.count(anterior)
    if n != 1:
        raise RuntimeError(f'{archivo}: se esperó 1 coincidencia, encontradas {n}: {anterior[:80]}')
    return cadena.replace(anterior, nuevo, 1)


def parchear():
    archivos = ['index.html','js/config.js','js/sincronizacion.js',
                'js/admin.js','js/app.js','js/reglas.js','service-worker.js']
    originales = {}
    for n in archivos:
        p = ROOT / n
        if not p.is_file():
            raise RuntimeError(f'No se encontró {p}; ejecute sobre el repositorio descargado.')
        s = p.read_text(encoding='utf-8')
        if BUILD in s:
            raise RuntimeError(f'{n} ya parece estar actualizado. No se hará una segunda aplicación.')
        originales[n] = s
    copia = {}

    c = originales['js/config.js']
    c = unica(c, 'const APP_VERSION="0002.9.10";', 'const APP_VERSION="0002.9.12";', 'config.js')
    c = unica(c, 'const APP_BUILD="'+BASE+'";', 'const APP_BUILD="'+BUILD+'";', 'config.js')
    c = unica(c, 'const SYNC_BATCH_SIZE=8;', 'const SYNC_BATCH_SIZE=4;\nconst RETENCION_INVENTARIO_DIAS=2;', 'config.js')
    copia['js/config.js'] = c

    s = originales['js/sincronizacion.js']
    s = unica(s,
        'let syncUltimoError="",syncBackendBuild="",syncBackendInventarioVerificado=false;',
        'let syncUltimoError="",syncBackendBuild="",syncBackendInventarioVerificado=false, syncBackendSoloIndividual=false;',
        'sincronizacion.js')

    s = unica(s, '''  if(String(r.version||"")!==String(BACKEND_VERSION_ESPERADA)){
    throw new Error("Backend incompatible. Encontrado: "+String(r.version||"sin versión")+" | Esperado: "+BACKEND_VERSION_ESPERADA);
  }''', '''  // Una diferencia de versión NO inmoviliza la cola. Se intenta transmitir y cada ID
  // debe ser confirmado por el servidor antes de marcarlo sincronizado.
  const versionBackend=String(r.version||"");''', 'sincronizacion.js')

    bloqueo_antiguo = '''  if(r.tiempos_base!==true)
    throw new Error("El servidor publicado no confirma el guardado de tiempos (tiempos_base: true). Respuesta: versión "+String(r.version||"sin versión")+", revisión "+String(r.revision||"sin revisión")+". Revise la implementación de Apps Script.");
  syncBackendBuild=String(r.build||r.revision||"sin compilación");'''
    bloqueo_nuevo = '''  // No se inmovilizan todos los eventos por faltar una marca de compilación.
  // Compatibilidad controlada: se transmiten individualmente y se valida cada ID.
  syncBackendSoloIndividual=r.tiempos_base!==true;
  syncBackendBuild=String(r.build||r.revision||"sin compilación")+(syncBackendSoloIndividual?" (compatible; tiempos no verificados)":"");'''
    s = unica(s, bloqueo_antiguo, bloqueo_nuevo, 'sincronizacion.js')

    lote_antiguo = '''async function enviarLote(payloads){
  const lote=codificarLote(payloads);
  // Mantiene corta la URL JSONP incluso cuando el código de inventario es largo.
  if(lote.length>1400&&payloads.length>1){
    const mitad=Math.ceil(payloads.length/2);
    const primero=await enviarLote(payloads.slice(0,mitad));
    const segundo=await enviarLote(payloads.slice(mitad));
    return primero.concat(segundo);
  }
  const r=await jsonpSeguro({action:"save_batch",lote},SYNC_REQUEST_TIMEOUT_MS);
  if(!r||r.ok!==true)throw new Error(r&&r.error?r.error:"Apps Script rechazó el lote.");
  return Array.isArray(r.data)?r.data:[];
}'''
    lote_nuevo = '''async function enviarIndividuales(payloads){
  const resultado=[];
  for(const p of payloads){
    try{
      // El servidor debe devolver el mismo ID y recurso antes de marcar el dato.
      await enviarYConfirmar(p);
      resultado.push({ok:true,id:p.id,recurso:p.recurso,result:"CONFIRMADO"});
    }catch(e){
      const msg=String(e&&e.message||e);
      resultado.push({ok:false,id:p.id,error:msg});
      // No saturar Apps Script cuando hay bloqueo o falta de conexión.
      if(/base ocupada|ocupado|tiempo límite|conectar|timeout/i.test(msg))break;
    }
  }
  return resultado;
}
async function enviarLote(payloads){
  if(syncBackendSoloIndividual)return enviarIndividuales(payloads);
  const lote=codificarLote(payloads);
  // Mantiene las peticiones por debajo del tamaño máximo aceptado por JSONP.
  if(lote.length>1400&&payloads.length>1){
    const mitad=Math.ceil(payloads.length/2);
    const primero=await enviarLote(payloads.slice(0,mitad));
    const segundo=await enviarLote(payloads.slice(mitad));
    return primero.concat(segundo);
  }
  let r;
  try{r=await jsonpSeguro({action:"save_batch",lote},SYNC_REQUEST_TIMEOUT_MS)}
  catch(e){throw e} // Ante timeout, el servidor pudo haber guardado el ID: reintentar sin duplicar.
  if(!r||r.ok!==true){
    const msg=String(r&&r.error||"Apps Script rechazó el lote.");
    if(/acción no reconocida|accion no reconocida|unknown action|save_batch.*no/i.test(msg)){
      syncBackendSoloIndividual=true;
      return enviarIndividuales(payloads);
    }
    throw new Error(msg);
  }
  // Nunca se admite un OK general como confirmación de todos los registros.
  if(!Array.isArray(r.data)){
    syncBackendSoloIndividual=true;
    return enviarIndividuales(payloads);
  }
  const porId=new Map(r.data.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
  const faltantes=payloads.filter(p=>!porId.has(String(p.id)));
  if(faltantes.length){
    const individuales=await enviarIndividuales(faltantes);
    individuales.forEach(x=>porId.set(String(x.id),x));
  }
  return payloads.map(p=>porId.get(String(p.id))||{ok:false,id:p.id,error:"ID sin confirmación; se reintentará."});
}'''
    s = unica(s, lote_antiguo, lote_nuevo, 'sincronizacion.js')

    cand_antiguo = '''      const candidatos=pendientesSyncOrdenados()
        .filter(r=>!syncEnCurso.has(String(r.id))&&!r.sync_bloqueado&&!intentados.has(String(r.id)))
        .slice(0,SYNC_BATCH_SIZE);
      if(!candidatos.length)break;
      if(candidatos.some(r=>r.estacion==="INVENTARIO")&&!syncBackendInventarioVerificado)
        throw new Error("El backend publicado aún no admite INVENTARIO. Actualice Apps Script; los registros quedan guardados localmente.");'''
    cand_nuevo = '''      const candidatos=pendientesSyncOrdenados()
        .filter(r=>!syncEnCurso.has(String(r.id))&&!r.sync_bloqueado&&!intentados.has(String(r.id)))
        // Inventario incompatible se conserva, SIN inmovilizar CHANCADO y demás estaciones.
        .filter(r=>r.estacion!=="INVENTARIO"||syncBackendInventarioVerificado)
        .slice(0,SYNC_BATCH_SIZE);
      if(!candidatos.length){
        if(!syncBackendInventarioVerificado&&pendientesSyncOrdenados().some(r=>r.estacion==="INVENTARIO"))
          ultimoError="INVENTARIO pendiente: el backend debe confirmar inventario:true en ping.";
        break;
      }'''
    s = unica(s,cand_antiguo,cand_nuevo,'sincronizacion.js')

    error_antiguo = '''            actualizarRegistro(String(p.id),{sincronizado:false,sync_bloqueado:false,sync_ultimo_error:msg,sync_ultima_fecha:fechaHoraLocal()});'''
    error_nuevo = '''             const fallido=obtenerRegistro(String(p.id));
             actualizarRegistro(String(p.id),{sincronizado:false,sync_bloqueado:false,
               sync_intentos:Number(fallido&&fallido.sync_intentos||0)+1,
               sync_ultimo_error:msg,sync_ultima_fecha:fechaHoraLocal()});'''
    s = unica(s,
        'function crearPayload(r){',
        '''function normalizarUbicacionInventario(v){
  const t=String(v||"").trim().toUpperCase();
  const viejo=t.match(/^(A|B|C|[4-9]|10)[ -](0|[1-9]|10)$/);
  return viejo?`${viejo[2]} ${viejo[1]}`:t;
}
function crearPayload(r){''', 'sincronizacion.js')
    s = unica(s,
        'recurso:recursoPayload(r),',
        'recurso:String(r.estacion||"").toUpperCase()==="INVENTARIO"?normalizarUbicacionInventario(recursoPayload(r)):recursoPayload(r),', 'sincronizacion.js')
    s = unica(s,
        'if(!/^(?:[ABC]|[4-9]|10)-(?:[1-9]|10)$/.test(p.recurso))throw new Error("Ubicación de inventario inválida.");',
        'if(!/^(?:0|[1-9]|10) (?:A|B|C|[4-9]|10)$/.test(p.recurso))throw new Error("Ubicación de inventario inválida. Use NÚMERO + SEGMENTO, ej. 3 A.");',
        'sincronizacion.js')
    copia['js/sincronizacion.js'] = s

    a = originales['js/admin.js']
    comienzo = a.find('function exportarCSV(){')
    final = a.find('\nfunction gruposFinalizadosAnteriores(',comienzo)
    if comienzo < 0 or final < 0:
        raise RuntimeError('admin.js: no se pudo identificar función exportarCSV.')
    a = a[:comienzo] + 'function exportarCSV(){return exportarExcel()}\n' + a[final+1:]
    a = unica(a,
      'function limpiezaAutomaticaLocal(){const ids=gruposFinalizadosAnteriores(RETENCION_LOCAL_DIAS);if(!ids.length)return;borrarIdsEnLote(ids,false)}',
      '''function idsInventarioVencidos(){
  const limite=Date.now()-RETENCION_INVENTARIO_DIAS*24*60*60*1000;
  return datos().filter(r=>!r.eliminado&&r.estacion==="INVENTARIO"&&r.sincronizado).filter(r=>{
    const f=new Date(String(r.fecha_hora||"").replace(" ","T"));return !isNaN(f)&&f.getTime()<limite;
  }).map(r=>r.id);
}
function limpiezaAutomaticaLocal(){
  const normales=gruposFinalizadosAnteriores(RETENCION_LOCAL_DIAS);
  const inventario=idsInventarioVencidos();
  const ids=[...new Set(normales.concat(inventario))].slice(0,BORRADO_LOTE_MAX);
  if(!ids.length)return;
  // Retención local NO elimina registros de Google Sheets.
  // Solo se purgan filas ya confirmadas, sin crear órdenes de borrado remoto.
  const quitar=new Set(ids);
  guardarDatos(datos().filter(r=>!quitar.has(r.id)));
  render();
}''','admin.js')
    copia['js/admin.js'] = a

    a = originales['js/app.js']
    a = unica(a,'$("exportarBtn").onclick=exportarCSV;', '$("exportarBtn").onclick=exportarExcel;','app.js')
    # INVENTARIO: admite QR extensos como texto (URL, signos y metadatos) sin recortar el PPO.
    # El límite 2048 evita truncar lecturas largas; a la base solo se envía PPO + 5 dígitos.
    a = unica(a,
      '?"Inventario: ingrese 5 números o una lectura de hasta 80 letras y números."',
      '?"Inventario: ingrese 5 números o escanee el QR completo (hasta 2048 caracteres)."', 'app.js')
    a = unica(a,
      '$("codigo").maxLength=esInventario?80:5;',
      '$("codigo").maxLength=esInventario?2048:5;', 'app.js')
    a = unica(a,
      '$("codigo").pattern=esInventario?"(?:[0-9]{5}|[A-Za-z0-9]{6,80})":"[0-9]{5}";',
      '$("codigo").pattern=esInventario?".{1,2048}":"[0-9]{5}";', 'app.js')
    a = unica(a,
      'if(!/^(?:\\d{5}|[A-Za-z0-9]{6,80})$/.test(lectura)){',
      'if(!(lectura.length===5&&/^\\d{5}$/.test(lectura))&&!(lectura.length>=6&&lectura.length<=2048)){', 'app.js')
    a = unica(a,
      'setEstado("Inventario: ingrese 5 números o lea el código alfanumérico completo.");',
      'setEstado("Inventario: ingrese 5 números o lea el QR completo (máximo 2048 caracteres).");', 'app.js')
    a = unica(a,
      'if(e.data!=null&&!($("estacion").value==="INVENTARIO"?/^[A-Za-z0-9]{0,80}$/:/^\\d{0,5}$/).test(proximo))rechazarEntradaCodigo(e);',
      'if($("estacion").value!=="INVENTARIO"&&e.data!=null&&!/^\\d{0,5}$/.test(proximo))rechazarEntradaCodigo(e);', 'app.js')
    a = unica(a,
      'if(texto!=null&&!($("estacion").value==="INVENTARIO"?/^[A-Za-z0-9]{0,80}$/:/^\\d{0,5}$/).test(codigoTrasInsercion(texto)))rechazarEntradaCodigo(e);',
      'if($("estacion").value!=="INVENTARIO"&&texto!=null&&!/^\\d{0,5}$/.test(codigoTrasInsercion(texto)))rechazarEntradaCodigo(e);', 'app.js')
    a = unica(a,
      '''      if(!/^[A-Za-z0-9]{0,80}$/.test(valor)){campo.value=valor.replace(/[^A-Za-z0-9]/g,"").slice(0,80);rechazarEntradaCodigo();return;}''',
      '''      if(valor.length>2048){campo.value=valor.slice(0,2048);setEstado("Inventario: lectura recortada a 2048 caracteres.");return;}''', 'app.js')
    # INVENTARIO: número 0..10 + segmento, guardado como "3 A".
    a = unica(a,
      'if(!/^(?:[1-9]|10)$/.test(cancha)){pedirDatoPendiente("Seleccione un número de cancha del 1 al 10.",$("inventarioCancha"));return;}',
      'if(!/^(?:0|[1-9]|10)$/.test(cancha)){pedirDatoPendiente("Seleccione un número de cancha del 0 al 10.",$("inventarioCancha"));return;}', 'app.js')
    a = unica(a,
      'estacion:"INVENTARIO",recurso:`${serie}-${cancha}`,detalle:lote,lectura_original:lectura,',
      'estacion:"INVENTARIO",recurso:`${cancha} ${serie}`,detalle:lote,lectura_original:lectura,', 'app.js')
    a = unica(a,
      'render();setEstado(`Inventario guardado: ${codigo} | cancha ${serie}-${cancha}. Pendiente de confirmación en la base.`);',
      'render();setEstado(`Inventario guardado: ${codigo} | ubicación ${cancha} ${serie}. Pendiente de confirmación en la base.`);', 'app.js')
    # MUESTREO: numeración 0..10; ubicacionMuestreoActual ya devuelve NUMERO + SEGMENTO.
    a = unica(a,
      '''numero.innerHTML='<option value="">N°</option>'+Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");''',
      '''numero.innerHTML='<option value="">N°</option>'+Array.from({length:11},(_,i)=>`<option value="${i}">${i}</option>`).join("");''', 'app.js')
    # DESCARGUIO/PATIO: el segundo registro crea FINAL y EN STOCK automáticamente.
    a = unica(a,
      '''  try{
    agregarRegistro(registro);
  }catch(error){''',
      '''  let registroStockAutomatico=null;
  try{
    if(estacion==="DESCARGUIO"&&recurso==="PATIO"&&evento==="FINAL"){
      registroStockAutomatico={...registro,id:uid(),evento:"EN STOCK",fecha_hora:fechaHoraLocal(new Date(Date.now()+1000)),detalle:"PATIO",sincronizado:false};
      const registrosActuales=datos();
      registrosActuales.unshift(registroStockAutomatico,registro);
      guardarDatos(registrosActuales); // ambos eventos en una sola escritura local
    }else agregarRegistro(registro);
  }catch(error){''','app.js')
    a = unica(a,
      '''sincronizarRegistroInmediato(registro);
  enfocarCodigo();''',
      '''sincronizarRegistroInmediato(registro);
  if(registroStockAutomatico)sincronizarRegistroInmediato(registroStockAutomatico);
  enfocarCodigo();''','app.js')
    copia['js/app.js'] = a

    r = originales['js/reglas.js']
    r = unica(r,
      'return(p[a.falta]||9)-(p[b.falta]||9)||String(a.ultimo).localeCompare(String(b.ultimo));',
      'return String(b.ultimo).localeCompare(String(a.ultimo));', 'reglas.js')
    copia['js/reglas.js'] = r

    x = originales['index.html'].replace(BASE,BUILD)
    x = unica(x,'Registro QR ver. 0002.9.10 CRQ- offline','Registro QR ver. 0002.9.12 CRQ- offline','index.html')
    x = unica(x,
      '<select id="muestreoSector"><option value="">Sector</option><option>A</option><option>B</option><option>C</option><option>PLANTA</option></select>',
      '<select id="muestreoSector"><option value="">Segmento</option><option>A</option><option>B</option><option>C</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option><option>9</option><option>10</option></select>', 'index.html')
    x = unica(x,'<div class="note">A/B/C usan posición 1–8.</div>', '<div class="note">Formato: número + segmento. Ejemplo: 3 A. Numeración 0–10.</div>', 'index.html')
    x = unica(x,'<option value="">N°</option><option value="1">1</option>', '<option value="">N°</option><option value="0">0</option><option value="1">1</option>', 'index.html')
    x = unica(x,'<div class="note">Ejemplo: serie A y cancha 5 → A-5.</div>', '<div class="note">Formato: número + segmento. Ejemplo: 3 A. Numeración 0–10.</div>', 'index.html')
    x = unica(x,'<button id="exportarBtn" class="warning">EXPORTAR RESPALDO CSV</button>',
              '<button id="exportarBtn" class="warning">CREAR RESPALDO EXCEL (.XLSX)</button>','index.html')
    x = unica(x,
      'Limpieza automática: finalizados sincronizados con más de 20 días, máximo 50 por ejecución.',
      'Limpieza automática: INVENTARIO sincronizado >2 días; demás finalizados sincronizados >20 días. Nunca borra pendientes.', 'index.html')
    marca = '<script src="js/app.js?v='+BUILD+'"></script>'
    x = unica(x,marca,'<script src="js/exportar_excel.js?v='+BUILD+'"></script>'+marca,'index.html')
    copia['index.html'] = x

    sw = originales['service-worker.js'].replace(BASE,BUILD)
    sw = unica(sw, "  './js/admin.js?v="+BUILD+"',",
        "  './js/admin.js?v="+BUILD+"',\n  './js/exportar_excel.js?v="+BUILD+"',", 'service-worker.js')
    copia['service-worker.js'] = sw

    # Validar todas las transformaciones ANTES de escribir cualquier archivo.
    for ruta,codigo in copia.items():
        if not codigo.strip(): raise RuntimeError(ruta+' quedó vacío')
    for ruta in archivos:
        original=ROOT/ruta
        respaldo=original.with_name(original.name+'.antes_2_9_12.bak')
        if respaldo.exists():raise RuntimeError(f'Ya existe respaldo anterior: {respaldo}. No se sobrescribirá.')
    salida=ROOT/'js/exportar_excel.js'
    if salida.exists(): raise RuntimeError('Ya existe js/exportar_excel.js; no se sobrescribirá. Si viene de 2.9.11, use una copia limpia 2.9.10 o retire ese archivo.')
    for ruta in archivos:
        shutil.copy2(ROOT/ruta,(ROOT/ruta).with_name(Path(ruta).name+'.antes_2_9_12.bak'))
    for ruta,codigo in copia.items():
        (ROOT/ruta).write_text(codigo,encoding='utf-8')
    shutil.copy2(SRC/'js/exportar_excel.js',salida)
    print('OK: parche 2.9.12 aplicado. Archivos: '+', '.join(archivos)+', js/exportar_excel.js')
    print('Se conservaron archivos .antes_2_9_12.bak. Revise y pruebe antes de publicar.')

if __name__=='__main__':
    try:parchear()
    except Exception as e:
        print('ERROR: '+str(e),file=sys.stderr)
        sys.exit(1)

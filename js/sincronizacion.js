/* KANBAN 0002.9.10 - SINCRONIZACIÓN Y DIAGNÓSTICO */
let syncProcesando=false,syncTimerPeriodico=null,syncTimerReintento=null,syncBackendVerificadoEn=0;
let syncUltimoError="",syncBackendBuild="",syncBackendInventarioVerificado=false;
const syncEnCurso=new Set();
let borradoSyncProcesando=false;
let dispositivoUltimoReporte=0,dispositivoReporteEnCurso=false;
let ordenRemotaEnCurso=false;
let ordenActualizacionEnCurso=false,verificacionActualizacionEnCurso=false;
let syncTimerInmediato=null;

function dispositivoId(){let id=localStorage.getItem(DEVICE_ID_KEY);if(!id){id="DISP-"+uid()+"-"+Math.random().toString(36).slice(2,7);localStorage.setItem(DEVICE_ID_KEY,id)}return id}
function nombreDispositivo(){return String(localStorage.getItem(DEVICE_NAME_KEY)||"EQUIPO SIN NOMBRE").trim()}
function areaDispositivo(){return String($("estacion")&&$("estacion").value||"").trim().toUpperCase()}
function recibirSolicitudRemota(token){
  const nuevo=String(token||"").trim();
  if(!nuevo||nuevo===localStorage.getItem(FORCE_SYNC_TOKEN_KEY))return false;
  localStorage.setItem(FORCE_SYNC_TOKEN_KEY,nuevo);
  localStorage.setItem(FORCE_SYNC_PENDING_KEY,"1");
  localStorage.setItem(SYNC_STATUS_KEY,"Orden recibida; esperando reintento.");
  // Distribuye los reintentos para que los equipos no disputen el mismo bloqueo de Sheets.
  setTimeout(()=>procesarPendientesSync(false),500+Math.floor(Math.random()*14500));
  return true;
}
function recibirSolicitudActualizacion(token){
  const nuevo=String(token||"").trim();
  if(!nuevo||nuevo===localStorage.getItem(UPDATE_TOKEN_KEY))return false;
  localStorage.setItem(UPDATE_TOKEN_KEY,nuevo);
  localStorage.setItem(UPDATE_PENDING_KEY,"1");
  localStorage.setItem(UPDATE_STATUS_KEY,"Orden recibida; esperando revisión.");
  setTimeout(()=>verificarActualizacionRemota(),500+Math.floor(Math.random()*9500));
  return true;
}
function recibirOrdenes(r){
  if(!r)return;
  recibirSolicitudRemota(r.sync_token);
  recibirSolicitudActualizacion(r.update_token);
}
async function verificarActualizacionRemota(){
  if(!navigator.onLine||localStorage.getItem(UPDATE_PENDING_KEY)!=="1"||verificacionActualizacionEnCurso)return;
  verificacionActualizacionEnCurso=true;
  try{
    if(!("serviceWorker" in navigator))throw new Error("Este navegador no admite actualización automática.");
    const registro=await navigator.serviceWorker.getRegistration();
    if(!registro)throw new Error("La app todavía no tiene un servicio de actualización instalado.");
    await registro.update();
    // controllerchange recarga la página si se instaló una versión nueva.
    localStorage.removeItem(UPDATE_PENDING_KEY);
    localStorage.setItem(UPDATE_ACK_KEY,localStorage.getItem(UPDATE_TOKEN_KEY)||"");
    localStorage.setItem(UPDATE_STATUS_KEY,"Revisión de versión realizada; comprobar compilación.");
    setTimeout(()=>reportarEstadoDispositivo(true),1200);
  }catch(e){localStorage.setItem(UPDATE_STATUS_KEY,"Revisión fallida: "+String(e.message||e).slice(0,100));console.warn("Actualización pendiente:",e)}
  finally{verificacionActualizacionEnCurso=false}
}
async function solicitarActualizacionEquipos(){
  localStorage.setItem(UPDATE_REQUEST_PENDING_KEY,"1");
  const estado=$("ordenActualizacionEstado");
  if(!navigator.onLine){if(estado)estado.textContent="Orden guardada en este móvil. Se enviará cuando vuelva internet.";return}
  if(ordenActualizacionEnCurso)return;
  ordenActualizacionEnCurso=true;
  if(estado)estado.textContent="Enviando orden de actualización…";
  try{
    const r=await jsonpSeguro({action:"request_update",pin:ADMIN_PIN},12000);
    if(!r||r.ok!==true||!r.data||!r.data.update_token)throw new Error(r&&r.error||"El servidor no confirmó la orden.");
    localStorage.removeItem(UPDATE_REQUEST_PENDING_KEY);
    recibirSolicitudActualizacion(r.data.update_token);
    if(estado)estado.textContent="Orden enviada. Los equipos revisarán la versión publicada al conectarse y abrir la app.";
  }catch(e){if(estado)estado.textContent="Orden pendiente: "+String(e.message||e)+". Se reintentará al conectar."}
  finally{ordenActualizacionEnCurso=false}
}
async function reportarEstadoDispositivo(forzar=false){
  const ahora=Date.now();
  if(syncProcesando||dispositivoReporteEnCurso||!navigator.onLine||!endpoint()||(!forzar&&(ahora-dispositivoUltimoReporte)<DEVICE_HEARTBEAT_MS))return;
  dispositivoReporteEnCurso=true;
  try{
    const pendientes=pendientesSyncOrdenados(),ultimoError=pendientes.map(r=>r.sync_ultimo_error||"").find(Boolean)||"";
    const r=await jsonpSeguro({action:"heartbeat",dispositivo_id:dispositivoId(),equipo:nombreDispositivo(),area:areaDispositivo(),frontend_version:APP_BUILD,pendientes:pendientes.length,ultimo_error:ultimoError,ultima_sync:localStorage.getItem(LAST_SYNC_KEY)||"",estado:"ONLINE",update_token_ack:localStorage.getItem(UPDATE_ACK_KEY)||"",update_status:localStorage.getItem(UPDATE_STATUS_KEY)||"",sync_token_ack:localStorage.getItem(SYNC_ACK_KEY)||"",sync_status:localStorage.getItem(SYNC_STATUS_KEY)||""},8000);
    if(r&&r.ok===true){dispositivoUltimoReporte=Date.now();recibirOrdenes(r.data);}
  }catch(e){
    // Si la hoja de control tarda, la señal remota sigue disponible sin leer Sheets.
    try{const s=await jsonpSeguro({action:"signal"},8000);if(s&&s.ok===true)recibirOrdenes(s);}catch(otra){console.warn("Estado de dispositivo:",otra)}
  }finally{dispositivoReporteEnCurso=false}
}
async function consultarOrdenes(){
  if(!navigator.onLine||syncProcesando||dispositivoReporteEnCurso||!endpoint())return;
  try{const r=await jsonpSeguro({action:"signal"},8000);if(r&&r.ok===true)recibirOrdenes(r)}
  catch(e){console.warn("Consulta de órdenes:",e)}
}
async function solicitarSyncEquipos(manual=true){
  localStorage.setItem(REMOTE_REQUEST_PENDING_KEY,"1");
  const estado=$("ordenSyncEstado");
  if(!navigator.onLine){if(estado)estado.textContent="Solicitud guardada. Se enviará cuando esta PC tenga conexión.";return}
  if(ordenRemotaEnCurso)return;
  ordenRemotaEnCurso=true;
  if(estado)estado.textContent="Enviando solicitud de reintento…";
  try{
    const r=await jsonpSeguro({action:"request_sync",pin:ADMIN_PIN},12000);
    if(!r||r.ok!==true||!r.data||!r.data.sync_token)throw new Error(r&&r.error||"El servidor no confirmó la solicitud.");
    localStorage.removeItem(REMOTE_REQUEST_PENDING_KEY);
    recibirSolicitudRemota(r.data.sync_token);
    if(estado)estado.textContent="Solicitud enviada. Los equipos con conexión reintentarán al recibirla; los desconectados lo harán al volver.";
  }catch(e){
    if(estado)estado.textContent="Solicitud pendiente: "+String(e.message||e)+". Se volverá a intentar con conexión.";
  }finally{ordenRemotaEnCurso=false}
}

function leerBorradosPendientes(){try{const d=JSON.parse(localStorage.getItem(DELETE_QUEUE_KEY)||"[]");return Array.isArray(d)?d:[]}catch(e){return[]}}
function guardarBorradosPendientes(d){localStorage.setItem(DELETE_QUEUE_KEY,JSON.stringify(d||[]))}
async function procesarBorradosPendientes(){
  if(borradoSyncProcesando||!navigator.onLine||!endpoint())return;
  const lote=leerBorradosPendientes().slice(0,DELETE_SYNC_BATCH);
  if(!lote.length)return;
  borradoSyncProcesando=true;
  try{
    const pendientes=leerBorradosPendientes();
    for(const x of lote){
      try{
        const r=await jsonpSeguro({action:"delete",id:x.id,estacion:x.estacion},5000);
        if(r&&r.ok===true&&String(r.id||"")===String(x.id)){const i=pendientes.findIndex(y=>y.id===x.id);if(i>=0){pendientes.splice(i,1);guardarBorradosPendientes(pendientes)}}
      }catch(e){break}
    }
  }finally{borradoSyncProcesando=false}
}

function recursoPayload(r){
  const e=String(r.estacion||"").trim().toUpperCase();
  let x=String(r.recurso||"").trim().toUpperCase();
  if(!x&&e==="DESCARGUIO"&&r.tolva)x="T"+String(r.tolva).replace(/^T/i,"");
  if(!x&&e==="CHANCADO"&&r.circuito)x="C"+String(r.circuito).replace(/^C/i,"");
  if(!x&&e==="SECADO"&&r.horno)x="H"+String(r.horno).replace(/^H/i,"");
  if(!x&&e==="PULVERIZADO"&&r.molino)x="M"+String(r.molino).replace(/^M/i,"");
  if(!x&&e==="BALANZA"&&(r.tipo_mineral||r.tipoMineral))x=String(r.tipo_mineral||r.tipoMineral).trim().toUpperCase();
  if(!x&&e==="MUESTREO"&&r.ubicacion)x=String(r.ubicacion).trim().toUpperCase();
  return x;
}

function crearPayload(r){
  return {
    action:"save",frontend_version:APP_VERSION,
    codigo:String(r.estacion||"").toUpperCase()==="INVENTARIO"?(extraerCodigoInventario(r.codigo)||String(r.codigo||"").trim()):String(r.codigo||"").trim(),
    evento:String(r.evento||"").trim().toUpperCase(),
    fecha_hora:String(r.fecha_hora||"").trim(),
    operador:String(r.operador||"").trim(),
    estacion:String(r.estacion||"").trim().toUpperCase(),
    recurso:recursoPayload(r),
    detalle:String(r.detalle||r.motivo_stock||"").trim().toUpperCase(),
    id:String(r.id||"").trim(),
    eliminado:r.eliminado===true?"true":"false",
    version:String(r.version||APP_VERSION)
  };
}

function validarPayload(p){
  if(!p.id)throw new Error("Registro sin ID.");
  if(!p.codigo)throw new Error("Registro sin código.");
  if(!p.estacion)throw new Error("Registro sin estación.");
  if(p.estacion==="INVENTARIO"){
    if(p.evento!=="LECTURA")throw new Error("Evento de inventario inválido.");
    if(!/^PPO\d{5}$/.test(p.codigo))throw new Error("Inventario: ingrese 5 dígitos o una lectura con un único código PPO.");
    if(!/^[A-Z]{1,3}-[1-9][0-9]?$/.test(p.recurso))throw new Error("Ubicación de inventario inválida.");
    if(!p.operador)throw new Error("Falta operario en inventario.");
    return;
  }
  // Los registros históricos y algunos eventos no tienen recurso. Se envían
  // con la celda vacía; la captura nueva conserva sus reglas por estación.
}

function jsonpSeguro(params,timeout=SYNC_REQUEST_TIMEOUT_MS){
  return new Promise((resolve,reject)=>{
    const cb="kamban_cb_"+Date.now()+"_"+Math.random().toString(36).slice(2);
    const script=document.createElement("script");
    let done=false;
    const clean=()=>{
      if(done)return;
      done=true;
      clearTimeout(timer);
      try{delete window[cb]}catch(e){window[cb]=undefined}
      if(script.parentNode)script.parentNode.removeChild(script);
    };
    const timer=setTimeout(()=>{clean();reject(new Error("Apps Script no respondió dentro del tiempo límite."));},timeout);
    window[cb]=r=>{clean();resolve(r)};
    script.onerror=()=>{clean();reject(new Error("No se pudo conectar con Apps Script."));};
    const q=new URLSearchParams();
    Object.entries({...params,callback:cb,_:Date.now()}).forEach(([k,v])=>{if(v!==undefined&&v!==null)q.set(k,String(v))});
    script.src=endpoint()+"?"+q.toString();
    document.head.appendChild(script);
  });
}

async function verificarBackend(forzar=false){
  const now=Date.now();
  if(!forzar&&syncBackendVerificadoEn&&(now-syncBackendVerificadoEn)<300000)return true;
  const r=await jsonpSeguro({action:"ping"},10000);
  if(!r||r.ok!==true)throw new Error("El backend no respondió correctamente.");
  if(String(r.version||"")!==String(BACKEND_VERSION_ESPERADA)){
    throw new Error("Backend incompatible. Encontrado: "+String(r.version||"sin versión")+" | Esperado: "+BACKEND_VERSION_ESPERADA);
  }
  if(r.tiempos_base!==true)
    throw new Error("El servidor publicado no confirma el guardado de tiempos (tiempos_base: true). Respuesta: versión "+String(r.version||"sin versión")+", revisión "+String(r.revision||"sin revisión")+". Revise la implementación de Apps Script.");
  syncBackendBuild=String(r.build||r.revision||"sin compilación");
  syncBackendInventarioVerificado=r.inventario===true;
  recibirOrdenes(r);
  syncBackendVerificadoEn=now;
  return true;
}

async function enviarYConfirmar(registro){
  const p=crearPayload(registro);
  validarPayload(p);
  const r=await jsonpSeguro(p,SYNC_REQUEST_TIMEOUT_MS);
  if(!r||r.ok!==true)throw new Error(r&&r.error?r.error:"Apps Script rechazó el registro.");
  const remoto=r.data||{};
  const id=String(remoto.id||r.id||"").trim();
  const rec=String(remoto.recurso||r.recurso||"").trim().toUpperCase();
  if(id!==p.id)throw new Error("El backend confirmó un ID diferente.");
  if(p.recurso&&rec!==p.recurso)throw new Error("RECURSO no confirmado.");
  return p;
}

// Orden fijo: código, evento, fecha/hora, operario, estación, recurso, detalle, ID.
// El backend sigue aceptando objetos de los celulares que aún no se actualizaron.
function codificarLote(payloads){
  const filas=payloads.map(p=>[p.codigo,p.evento,p.fecha_hora,p.operador,p.estacion,p.recurso,p.detalle,p.id]);
  return btoa(unescape(encodeURIComponent(JSON.stringify(filas)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
async function enviarLote(payloads){
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
}

function esperaReintento(n){
  return Math.min(SYNC_RETRY_MAX_MS,SYNC_RETRY_BASE_MS*Math.pow(2,Math.min(Math.max(n-1,0),4)));
}

function programarReintentoGlobal(delay=SYNC_RETRY_BASE_MS){
  clearTimeout(syncTimerReintento);
  if(!navigator.onLine)return;
  syncTimerReintento=setTimeout(()=>procesarPendientesSync(false),delay+Math.floor(Math.random()*10000));
}

async function procesarPendientesSync(manual=false){
  if(syncProcesando){if(manual){localStorage.setItem(FORCE_SYNC_PENDING_KEY,"1");alert("Hay una sincronización en curso. El reintento se ejecutará al terminar.");}return;}
  if(!endpoint()){if(manual)alert("Falta configurar la URL de Apps Script.");return}
  if(!navigator.onLine){if(manual){localStorage.setItem(FORCE_SYNC_PENDING_KEY,"1");alert("Sin conexión. El reintento quedó programado para cuando vuelva internet.");}return}

  const forzado=localStorage.getItem(FORCE_SYNC_PENDING_KEY)==="1";
  const tokenForzado=forzado?localStorage.getItem(FORCE_SYNC_TOKEN_KEY)||"":"";
  if(forzado)localStorage.removeItem(FORCE_SYNC_PENDING_KEY);
  if(forzado)pendientesSyncOrdenados().filter(r=>r.sync_bloqueado).forEach(r=>
    actualizarRegistro(String(r.id),{sync_bloqueado:false}));

  // Una validación antigua de RECURSO no debe dejar registros históricos bloqueados.
  pendientesSyncOrdenados().filter(r=>r.sync_bloqueado&&/^Falta RECURSO\b/.test(r.sync_ultimo_error||""))
    .forEach(r=>actualizarRegistro(String(r.id),{sync_bloqueado:false}));

  // Permite volver a probar registros observados en versiones anteriores.
  if(manual)pendientesSyncOrdenados().filter(r=>r.sync_bloqueado).forEach(r=>
    actualizarRegistro(String(r.id),{sync_bloqueado:false}));

  syncProcesando=true;
  let enviados=0,observados=0,ultimoError="";
  const intentados=new Set();

  try{
    // Antes de enviar se verifica la versión una sola vez cada cinco minutos.
    // Evita que una app nueva marque registros como observados contra un backend antiguo.
    if(manual||pendientesSyncOrdenados().length)await verificarBackend(manual);

    while(navigator.onLine){
      const candidatos=pendientesSyncOrdenados()
        .filter(r=>!syncEnCurso.has(String(r.id))&&!r.sync_bloqueado&&!intentados.has(String(r.id)))
        .slice(0,SYNC_BATCH_SIZE);
      if(!candidatos.length)break;
      if(candidatos.some(r=>r.estacion==="INVENTARIO")&&!syncBackendInventarioVerificado)
        throw new Error("El backend publicado aún no admite INVENTARIO. Actualice Apps Script; los registros quedan guardados localmente.");
      candidatos.forEach(r=>intentados.add(String(r.id)));

      const payloads=[];
      for(const registro of candidatos){
        try{const p=crearPayload(registro);validarPayload(p);payloads.push(p)}
        catch(error){
          const msg=String(error&&error.message?error.message:error);
          actualizarRegistro(String(registro.id),{sincronizado:false,sync_bloqueado:true,sync_ultimo_error:msg,sync_ultima_fecha:fechaHoraLocal()});
          ultimoError=msg;observados++;
        }
      }
      if(!payloads.length){render();continue;}
      payloads.forEach(p=>syncEnCurso.add(String(p.id)));
      try{
        const respuesta=await enviarLote(payloads);
        const porId=new Map(respuesta.map(x=>[String(x.id||""),x]));
        payloads.forEach(p=>{
          const x=porId.get(String(p.id));
          if(x&&x.ok===true&&(!p.recurso||String(x.recurso||"").toUpperCase()===p.recurso)){
            const local=obtenerRegistro(String(p.id));
            actualizarRegistro(String(p.id),{sincronizado:true,sync_bloqueado:false,codigo:p.codigo,
              lectura_original:p.estacion==="INVENTARIO"?String(local&&local.lectura_original||local&&local.codigo||p.codigo):String(local&&local.lectura_original||""),
              detalle:p.estacion==="INVENTARIO"?p.codigo.slice(-5):p.detalle,
              recurso:String(x.recurso||p.recurso||"").toUpperCase(),sync_ultimo_error:"",sync_ultima_fecha:fechaHoraLocal()});
            enviados++;
          }else{
            const msg=String(x&&x.error||(x&&x.ok?"El servidor confirmó otro recurso para este ID.":"El servidor no confirmó el registro."));
            actualizarRegistro(String(p.id),{sincronizado:false,sync_bloqueado:false,sync_ultimo_error:msg,sync_ultima_fecha:fechaHoraLocal()});
            ultimoError=msg;observados++;
          }
        });
        if(enviados)localStorage.setItem(LAST_SYNC_KEY,fechaHoraLocal());
      }catch(error){
        const msg=String(error&&error.message?error.message:error);
        payloads.forEach(p=>{const a=obtenerRegistro(String(p.id));actualizarRegistro(String(p.id),{sincronizado:false,sync_intentos:Number(a&&a.sync_intentos||0)+1,sync_ultimo_error:msg,sync_ultima_fecha:fechaHoraLocal()})});
        ultimoError=msg;
        programarReintentoGlobal(SYNC_RETRY_BASE_MS);
        break;
      }finally{payloads.forEach(p=>syncEnCurso.delete(String(p.id)))}
      render();
    }
  }catch(error){
    ultimoError=String(error&&error.message?error.message:error);
    programarReintentoGlobal(SYNC_RETRY_MAX_MS);
  }finally{
    syncProcesando=false;
    syncUltimoError=ultimoError;
    if(tokenForzado){
      const restantes=pendientesSyncOrdenados().length;
      localStorage.setItem(SYNC_ACK_KEY,tokenForzado);
      localStorage.setItem(SYNC_STATUS_KEY,restantes?`${restantes} pendientes. ${ultimoError||"Se reintentará."}`.slice(0,140):"Transferencia terminada; 0 pendientes.");
      setTimeout(()=>reportarEstadoDispositivo(true),1200);
    }
    else if(enviados)setTimeout(()=>reportarEstadoDispositivo(true),1200);
    render();
    if(!$("adminModal").classList.contains("hide"))actualizarAdmin();
    if(localStorage.getItem(FORCE_SYNC_PENDING_KEY)==="1"&&navigator.onLine)
      setTimeout(()=>procesarPendientesSync(false),1000);
  }

  if(observados&&ultimoError)programarReintentoGlobal(SYNC_RETRY_MAX_MS);

  if(manual){
    const faltan=pendientesSyncOrdenados().length;
    alert((ultimoError?"Sincronización con observaciones.\n\n"+ultimoError+"\n\n":"")+"Sincronizados: "+enviados+"\nObservados: "+observados+"\nPendientes: "+faltan);
  }
}

function sincronizarRegistroInmediato(registro){
  clearTimeout(syncTimerInmediato);
  syncTimerInmediato=setTimeout(()=>procesarPendientesSync(false),700);
}
function sincronizar(manual=false){return procesarPendientesSync(manual)}

function cargarDrive(callback){
  window.errorReporte="";
  jsonpSeguro({action:"kanban"},30000)
    .then(r=>{
      if(!r||r.ok!==true)throw new Error(r&&r.error?r.error:"Apps Script no devolvió una respuesta válida.");
      if(String(r.version||"")!==String(BACKEND_VERSION_ESPERADA)){
        throw new Error("Backend sin actualizar. Encontrado: "+String(r.version||"sin versión")+" | Esperado: "+BACKEND_VERSION_ESPERADA);
      }
      window.datosRemotos=Array.isArray(r.data)?r.data:[];
      window.metaReporte=r.meta||null;
      callback&&callback();
    })
    .catch(e=>{
      console.error("Lectura KANBAN:",e);
      window.datosRemotos=[];
      window.errorReporte=String(e&&e.message?e.message:e);
      callback&&callback();
    });
}

window.addEventListener("online",()=>{syncBackendVerificadoEn=0;setTimeout(()=>procesarPendientesSync(false),300);setTimeout(()=>procesarBorradosPendientes(),600);setTimeout(()=>reportarEstadoDispositivo(true),900);setTimeout(()=>verificarActualizacionRemota(),1100);if(localStorage.getItem(REMOTE_REQUEST_PENDING_KEY)==="1")setTimeout(()=>solicitarSyncEquipos(false),1200);if(localStorage.getItem(UPDATE_REQUEST_PENDING_KEY)==="1")setTimeout(()=>solicitarActualizacionEquipos(),1500)});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&navigator.onLine){setTimeout(()=>procesarPendientesSync(false),400);setTimeout(()=>reportarEstadoDispositivo(true),800);setTimeout(()=>verificarActualizacionRemota(),1200)}});
document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>procesarPendientesSync(false),1000);
  setTimeout(()=>procesarBorradosPendientes(),1500);
  setTimeout(()=>reportarEstadoDispositivo(true),1800);
  syncTimerPeriodico=setInterval(()=>{if(navigator.onLine)procesarPendientesSync(false)},SYNC_PERIODIC_MS);
  setInterval(()=>{if(navigator.onLine)procesarBorradosPendientes()},SYNC_PERIODIC_MS);
  setInterval(()=>{if(navigator.onLine)reportarEstadoDispositivo(false)},DEVICE_HEARTBEAT_MS);
  setInterval(()=>{if(navigator.onLine)consultarOrdenes()},SIGNAL_POLL_MS);
  setInterval(()=>{if(navigator.onLine&&localStorage.getItem(REMOTE_REQUEST_PENDING_KEY)==="1")solicitarSyncEquipos(false)},DEVICE_HEARTBEAT_MS);
  setInterval(()=>{if(navigator.onLine){if(localStorage.getItem(UPDATE_REQUEST_PENDING_KEY)==="1")solicitarActualizacionEquipos();verificarActualizacionRemota()}},DEVICE_HEARTBEAT_MS);
  if(navigator.onLine&&localStorage.getItem(REMOTE_REQUEST_PENDING_KEY)==="1")setTimeout(()=>solicitarSyncEquipos(false),1300);
  if(navigator.onLine&&localStorage.getItem(UPDATE_REQUEST_PENDING_KEY)==="1")setTimeout(()=>solicitarActualizacionEquipos(),1500);
  if(navigator.onLine&&localStorage.getItem(UPDATE_PENDING_KEY)==="1")setTimeout(()=>verificarActualizacionRemota(),1700);
});

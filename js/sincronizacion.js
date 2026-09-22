/* KANBAN 0002.8.5 - SINCRONIZACIÓN SEGURA Y LIGERA */
let syncProcesando=false,syncTimerPeriodico=null,syncTimerReintento=null,syncBackendVerificadoEn=0;
const syncEnCurso=new Set();
let borradoSyncProcesando=false;
let dispositivoUltimoReporte=0,dispositivoReporteEnCurso=false;

function dispositivoId(){let id=localStorage.getItem(DEVICE_ID_KEY);if(!id){id="DISP-"+uid()+"-"+Math.random().toString(36).slice(2,7);localStorage.setItem(DEVICE_ID_KEY,id)}return id}
function nombreDispositivo(){return String(localStorage.getItem(DEVICE_NAME_KEY)||"EQUIPO SIN NOMBRE").trim()}
function areaDispositivo(){return String($("estacion")&&$("estacion").value||"").trim().toUpperCase()}
async function reportarEstadoDispositivo(forzar=false){const ahora=Date.now();if(dispositivoReporteEnCurso||!navigator.onLine||!endpoint()||(!forzar&&(ahora-dispositivoUltimoReporte)<DEVICE_HEARTBEAT_MS))return;dispositivoReporteEnCurso=true;try{const pendientes=pendientesSyncOrdenados(),ultimoError=pendientes.map(r=>r.sync_ultimo_error||"").find(Boolean)||"";const r=await jsonpSeguro({action:"heartbeat",dispositivo_id:dispositivoId(),equipo:nombreDispositivo(),area:areaDispositivo(),frontend_version:APP_VERSION,pendientes:pendientes.length,ultimo_error:ultimoError,ultima_sync:localStorage.getItem(LAST_SYNC_KEY)||"",estado:navigator.onLine?"ONLINE":"OFFLINE"},8000);if(r&&r.ok===true)dispositivoUltimoReporte=Date.now()}catch(e){console.warn("Estado de dispositivo:",e)}finally{dispositivoReporteEnCurso=false}}

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
        if(r&&r.ok===true){const i=pendientes.findIndex(y=>y.id===x.id);if(i>=0){pendientes.splice(i,1);guardarBorradosPendientes(pendientes)}}
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
    codigo:String(r.codigo||"").trim(),
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
  // Descarguío en stock no tiene tolva por diseño; no debe bloquear la cola local.
  const descarguioStock=p.estacion==="DESCARGUIO"&&["EN STOCK","SALIDA STOCK"].includes(p.evento);
  if(["BALANZA","DESCARGUIO","CHANCADO","MUESTREO","SECADO","PULVERIZADO"].includes(p.estacion)&&!p.recurso&&!descarguioStock){
    throw new Error("Falta RECURSO en "+p.codigo+".");
  }
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

function codificarLote(payloads){return btoa(unescape(encodeURIComponent(JSON.stringify(payloads)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function enviarLote(payloads){
  const r=await jsonpSeguro({action:"save_batch",lote:codificarLote(payloads)},SYNC_REQUEST_TIMEOUT_MS);
  if(!r||r.ok!==true)throw new Error(r&&r.error?r.error:"Apps Script rechazó el lote.");
  return Array.isArray(r.data)?r.data:[];
}

function esperaReintento(n){
  return Math.min(SYNC_RETRY_MAX_MS,SYNC_RETRY_BASE_MS*Math.pow(2,Math.min(Math.max(n-1,0),4)));
}

function programarReintentoGlobal(delay=SYNC_RETRY_BASE_MS){
  clearTimeout(syncTimerReintento);
  if(!navigator.onLine)return;
  syncTimerReintento=setTimeout(()=>procesarPendientesSync(false),delay);
}

async function procesarPendientesSync(manual=false){
  if(syncProcesando)return;
  if(!endpoint()){if(manual)alert("Falta configurar la URL de Apps Script.");return}
  if(!navigator.onLine){if(manual)alert("Sin conexión. Los registros quedan guardados localmente.");return}

  syncProcesando=true;
  let enviados=0,observados=0,ultimoError="";

  try{
    // Antes de enviar se verifica la versión una sola vez cada cinco minutos.
    // Evita que una app nueva marque registros como observados contra un backend antiguo.
    await verificarBackend(manual);

    while(navigator.onLine){
      const candidatos=pendientesSyncOrdenados()
        .filter(r=>!syncEnCurso.has(String(r.id))&&!r.sync_bloqueado)
        .slice(0,SYNC_BATCH_SIZE);
      if(!candidatos.length)break;

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
          if(x&&x.ok===true){
            actualizarRegistro(String(p.id),{sincronizado:true,sync_bloqueado:false,recurso:String(x.recurso||p.recurso||"").toUpperCase(),sync_ultimo_error:"",sync_ultima_fecha:fechaHoraLocal()});
            enviados++;
          }else{
            const msg=String(x&&x.error||"El servidor no confirmó el registro.");
            actualizarRegistro(String(p.id),{sincronizado:false,sync_bloqueado:true,sync_ultimo_error:msg,sync_ultima_fecha:fechaHoraLocal()});
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
      await new Promise(r=>setTimeout(r,80));
    }
  }catch(error){
    ultimoError=String(error&&error.message?error.message:error);
    programarReintentoGlobal(SYNC_RETRY_BASE_MS);
  }finally{
    syncProcesando=false;
    render();
  }

  if(manual){
    const faltan=pendientesSyncOrdenados().length;
    alert((ultimoError?"Sincronización con observaciones.\n\n"+ultimoError+"\n\n":"")+"Sincronizados: "+enviados+"\nObservados: "+observados+"\nPendientes: "+faltan);
  }
}

function sincronizarRegistroInmediato(registro){setTimeout(()=>procesarPendientesSync(false),0)}
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

window.addEventListener("online",()=>{syncBackendVerificadoEn=0;setTimeout(()=>procesarPendientesSync(false),300);setTimeout(()=>procesarBorradosPendientes(),600);setTimeout(()=>reportarEstadoDispositivo(true),900)});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&navigator.onLine)setTimeout(()=>procesarPendientesSync(false),400)});
document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>procesarPendientesSync(false),1000);
  setTimeout(()=>procesarBorradosPendientes(),1500);
  setTimeout(()=>reportarEstadoDispositivo(true),1800);
  syncTimerPeriodico=setInterval(()=>{if(navigator.onLine)procesarPendientesSync(false)},SYNC_PERIODIC_MS);
  setInterval(()=>{if(navigator.onLine)procesarBorradosPendientes()},SYNC_PERIODIC_MS);
  setInterval(()=>{if(navigator.onLine)reportarEstadoDispositivo(false)},DEVICE_HEARTBEAT_MS);
});

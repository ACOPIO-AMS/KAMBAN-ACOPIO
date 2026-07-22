/* KAMBAN ACOPIO 0002.7 - SINCRONIZACIÓN SEGURA */
let syncProcesando=false,syncTimerPeriodico=null,syncTimerReintento=null,syncBackendVerificadoEn=0;
const syncEnCurso=new Set();

function recursoPayload(r){
  const e=String(r.estacion||"").trim().toUpperCase();
  let x=String(r.recurso||"").trim().toUpperCase();
  if(!x&&e==="DESCARGUIO"&&r.tolva)x="T"+String(r.tolva).replace(/^T/i,"");
  if(!x&&e==="CHANCADO"&&r.circuito)x="C"+String(r.circuito).replace(/^C/i,"");
  if(!x&&e==="SECADO"&&r.horno)x="H"+String(r.horno).replace(/^H/i,"");
  if(!x&&e==="PULVERIZADO"&&r.molino)x="M"+String(r.molino).replace(/^M/i,"");
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
    id:String(r.id||"").trim(),
    eliminado:r.eliminado===true?"true":"false",
    version:String(r.version||APP_VERSION)
  };
}

function validarPayload(p){
  if(!p.id)throw new Error("Registro sin ID.");
  if(!p.codigo)throw new Error("Registro sin código.");
  if(!p.estacion)throw new Error("Registro sin estación.");
  if(["DESCARGUIO","CHANCADO","SECADO","PULVERIZADO"].includes(p.estacion)&&!p.recurso){
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
  let enviados=0,ultimoError="";

  try{
    // En modo automático se envía directamente: evita una llamada ping adicional.
    // La verificación de versión se mantiene para la prueba manual del administrador.
    if(manual)await verificarBackend(true);

    while(navigator.onLine){
      const pendiente=pendientesSyncOrdenados().find(r=>!syncEnCurso.has(String(r.id)));
      if(!pendiente)break;
      const id=String(pendiente.id);
      syncEnCurso.add(id);

      try{
        const p=await enviarYConfirmar(pendiente);
        actualizarRegistro(id,{sincronizado:true,recurso:p.recurso,sync_ultimo_error:"",sync_ultima_fecha:fechaHoraLocal()});
        enviados++;
        localStorage.setItem(LAST_SYNC_KEY,fechaHoraLocal());
        render();
      }catch(error){
        const msg=String(error&&error.message?error.message:error);
        const actual=obtenerRegistro(id);
        const intentos=Number(actual&&actual.sync_intentos||0)+1;
        actualizarRegistro(id,{sincronizado:false,sync_intentos:intentos,sync_ultimo_error:msg,sync_ultima_fecha:fechaHoraLocal()});
        ultimoError=msg;
        render();
        programarReintentoGlobal(esperaReintento(intentos));
        break;
      }finally{
        syncEnCurso.delete(id);
      }

      await new Promise(r=>setTimeout(r,120));
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
    alert(ultimoError?("No se completó la sincronización.\n\n"+ultimoError+"\n\nPendientes: "+faltan):("Sincronizados: "+enviados+"\nPendientes: "+faltan));
  }
}

function sincronizarRegistroInmediato(registro){setTimeout(()=>procesarPendientesSync(false),0)}
function sincronizar(manual=false){return procesarPendientesSync(manual)}

function cargarDrive(callback){
  jsonpSeguro({action:"list"},30000)
    .then(r=>{window.datosRemotos=r&&Array.isArray(r.data)?r.data:[];callback&&callback()})
    .catch(e=>{console.error("Lectura Drive:",e);window.datosRemotos=null;callback&&callback()});
}

window.addEventListener("online",()=>{syncBackendVerificadoEn=0;setTimeout(()=>procesarPendientesSync(false),300)});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&navigator.onLine)setTimeout(()=>procesarPendientesSync(false),400)});
document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>procesarPendientesSync(false),1000);
  syncTimerPeriodico=setInterval(()=>{if(navigator.onLine)procesarPendientesSync(false)},SYNC_PERIODIC_MS);
});

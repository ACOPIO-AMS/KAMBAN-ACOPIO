let syncProcesando=false,syncTimer=null,syncUltimoError="",syncEnCurso=new Set(),ultimoHeartbeat=0;
function dispositivoId(){let id=localStorage.getItem(DEVICE_ID_KEY);if(!id){id="DISP-"+uid();localStorage.setItem(DEVICE_ID_KEY,id)}return id}
function nombreDispositivo(){return String(localStorage.getItem(DEVICE_NAME_KEY)||"EQUIPO SIN NOMBRE").trim()}
function jsonpSeguro(params,timeout=SYNC_REQUEST_TIMEOUT_MS){return new Promise((resolve,reject)=>{const cb="kcb_"+Date.now()+"_"+Math.random().toString(36).slice(2),s=document.createElement("script");let done=false;const limpiar=()=>{if(done)return;done=true;clearTimeout(t);try{delete window[cb]}catch(e){};s.remove()};const t=setTimeout(()=>{limpiar();reject(new Error("Apps Script no respondió a tiempo."))},timeout);window[cb]=r=>{limpiar();resolve(r)};s.onerror=()=>{limpiar();reject(new Error("No se pudo conectar con Apps Script."))};const q=new URLSearchParams({...params,callback:cb,_:Date.now()});s.src=endpoint()+"?"+q.toString();document.head.appendChild(s)})}
function crearPayload(r){return{action:"save",frontend_version:APP_VERSION,codigo:r.estacion==="INVENTARIO"?(extraerCodigoInventario(r.codigo)||r.codigo):String(r.codigo||""),evento:String(r.evento||"").toUpperCase(),fecha_hora:String(r.fecha_hora||""),operador:String(r.operador||""),estacion:String(r.estacion||"").toUpperCase(),recurso:r.estacion==="INVENTARIO"?normalizarUbicacion(r.recurso):String(r.recurso||"").toUpperCase(),detalle:String(r.detalle||"").toUpperCase(),id:String(r.id||"")}}
function validarPayload(p){if(!p.id)throw new Error("Registro sin ID");if(!p.codigo)throw new Error("Registro sin código");if(!p.estacion)throw new Error("Registro sin estación");if(p.estacion==="INVENTARIO"){if(!/^PPO\d{5}$/.test(p.codigo))throw new Error("Código de inventario inválido");if(!esUbicacionValida(p.recurso))throw new Error("Ubicación inválida; use 3 A");if(!p.operador)throw new Error("Falta operador")}}
function codificarLote(ps){const filas=ps.map(p=>[p.codigo,p.evento,p.fecha_hora,p.operador,p.estacion,p.recurso,p.detalle,p.id]);return btoa(unescape(encodeURIComponent(JSON.stringify(filas)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
async function enviarIndividual(p){const r=await jsonpSeguro(p);if(!r||r.ok!==true)throw new Error(r&&r.error||"Servidor rechazó el registro");const id=String((r.data&&r.data.id)||r.id||"");if(id!==p.id)throw new Error("ID no confirmado por servidor");return{ok:true,id:p.id,recurso:String((r.data&&r.data.recurso)||r.recurso||"").toUpperCase()}}
async function enviarLote(payloads){
 const lote=codificarLote(payloads);if(lote.length>1300&&payloads.length>1){const m=Math.ceil(payloads.length/2);return (await enviarLote(payloads.slice(0,m))).concat(await enviarLote(payloads.slice(m)))}
 try{const r=await jsonpSeguro({action:"save_batch",lote});if(r&&r.ok===true&&Array.isArray(r.data))return r.data;if(r&&r.ok===false&&!/acción no reconocida|accion no reconocida|unknown action/i.test(String(r.error||"")))throw new Error(r.error||"Lote rechazado")}catch(e){if(/tiempo|conectar|respondió|ocupad/i.test(String(e.message||e)))throw e}
 const out=[];for(const p of payloads){try{out.push(await enviarIndividual(p))}catch(e){out.push({ok:false,id:p.id,error:String(e.message||e)});if(/tiempo|conectar|ocupad/i.test(String(e.message||e)))break}}return out;
}
function programarReintento(ms=SYNC_RETRY_BASE_MS){clearTimeout(syncTimer);if(navigator.onLine)syncTimer=setTimeout(()=>procesarPendientesSync(false),ms+Math.floor(Math.random()*5000))}
async function verificarBackend(){try{const r=await jsonpSeguro({action:"ping"},10000);return !!(r&&r.ok===true)}catch(e){return false}}
async function procesarPendientesSync(manual=false){
 if(syncProcesando)return;if(!navigator.onLine||!endpoint()){if(manual)alert("Sin conexión o sin endpoint. Los datos siguen guardados localmente.");return}
 syncProcesando=true;let enviados=0,errores=0;syncUltimoError="";
 try{
   // Evitar ping adicional: el primer save_batch prueba la conexión.
   const intentados=new Set();
   while(navigator.onLine){
    const regs=pendientesSyncOrdenados().filter(r=>!syncEnCurso.has(r.id)&&!intentados.has(r.id)).slice(0,SYNC_BATCH_SIZE);if(!regs.length)break;
    const ps=[];for(const r of regs){intentados.add(r.id);try{const p=crearPayload(r);validarPayload(p);ps.push(p)}catch(e){actualizarRegistro(r.id,{sync_ultimo_error:String(e.message||e),sync_intentos:Number(r.sync_intentos||0)+1});errores++}}
    if(!ps.length)continue;ps.forEach(p=>syncEnCurso.add(p.id));
    try{const resp=await enviarLote(ps),map=new Map((resp||[]).map(x=>[String(x.id||""),x]));for(const p of ps){const x=map.get(p.id);if(x&&x.ok===true){actualizarRegistro(p.id,{sincronizado:true,sync_ultimo_error:"",sync_ultima_fecha:fechaHoraLocal(),recurso:p.recurso,codigo:p.codigo});enviados++}else{const a=obtenerRegistro(p.id);actualizarRegistro(p.id,{sincronizado:false,sync_intentos:Number(a&&a.sync_intentos||0)+1,sync_ultimo_error:String(x&&x.error||"Servidor no confirmó el ID"),sync_ultima_fecha:fechaHoraLocal()});errores++}}if(enviados)localStorage.setItem(LAST_SYNC_KEY,fechaHoraLocal())}
    catch(e){syncUltimoError=String(e.message||e);ps.forEach(p=>{const a=obtenerRegistro(p.id);actualizarRegistro(p.id,{sync_intentos:Number(a&&a.sync_intentos||0)+1,sync_ultimo_error:syncUltimoError,sync_ultima_fecha:fechaHoraLocal()})});programarReintento();break}
    finally{ps.forEach(p=>syncEnCurso.delete(p.id))}
    render();
   }
 }finally{syncProcesando=false;render();if(manual){const n=pendientesSyncOrdenados().length;alert(`Sincronización terminada. Enviados: ${enviados}. Pendientes: ${n}.${syncUltimoError?"\n"+syncUltimoError:""}`)}reportarEstadoDispositivo(true)}
}
function sincronizarRegistroInmediato(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>procesarPendientesSync(false),500)}
async function reportarEstadoDispositivo(forzar=false){if(!navigator.onLine||syncProcesando)return;const ahora=Date.now();if(!forzar&&ahora-ultimoHeartbeat<DEVICE_HEARTBEAT_MS)return;try{const p=pendientesSyncOrdenados();const r=await jsonpSeguro({action:"heartbeat",dispositivo_id:dispositivoId(),equipo:nombreDispositivo(),area:$("estacion")?$("estacion").value:"",frontend_version:APP_BUILD,pendientes:p.length,ultimo_error:p.map(x=>x.sync_ultimo_error).find(Boolean)||"",ultima_sync:localStorage.getItem(LAST_SYNC_KEY)||"",estado:"ONLINE",sync_token_ack:localStorage.getItem(SYNC_ACK_KEY)||"",sync_status:localStorage.getItem(SYNC_STATUS_KEY)||""},8000);if(r&&r.ok)ultimoHeartbeat=Date.now()}catch(e){}}

async function consultarOrdenes(){
 if(!navigator.onLine||syncProcesando)return;
 try{
  const r=await jsonpSeguro({action:"signal"},8000);if(!r||r.ok!==true)return;
  const st=String(r.sync_token||"");const old=String(localStorage.getItem(FORCE_SYNC_TOKEN_KEY)||"");
  if(st&&st!==old){localStorage.setItem(FORCE_SYNC_TOKEN_KEY,st);localStorage.setItem(SYNC_STATUS_KEY,"Orden recibida; reintentando.");setTimeout(()=>procesarPendientesSync(false),500+Math.floor(Math.random()*5000));}
  const ut=String(r.update_token||"");const oldu=String(localStorage.getItem(UPDATE_TOKEN_KEY)||"");
  if(ut&&ut!==oldu){localStorage.setItem(UPDATE_TOKEN_KEY,ut);localStorage.setItem(UPDATE_STATUS_KEY,"Orden recibida; revisando versión.");await aplicarActualizacionRemota();}
 }catch(e){}
}
async function aplicarActualizacionRemota(){
 try{if(!("serviceWorker" in navigator))throw new Error("Service Worker no disponible");const sw=await navigator.serviceWorker.getRegistration();if(!sw)throw new Error("Service Worker no instalado");await sw.update();localStorage.setItem(UPDATE_ACK_KEY,localStorage.getItem(UPDATE_TOKEN_KEY)||"");localStorage.setItem(UPDATE_STATUS_KEY,"Versión revisada");setTimeout(()=>reportarEstadoDispositivo(true),1000)}catch(e){localStorage.setItem(UPDATE_STATUS_KEY,String(e.message||e))}
}
async function solicitarActualizacionEquipos(){try{const r=await jsonpSeguro({action:"request_update",pin:ADMIN_PIN},12000);if(!r||!r.ok)throw new Error(r&&r.error||"No confirmado");alert("Orden de actualización enviada a los equipos.")}catch(e){alert("No se pudo enviar actualización: "+String(e.message||e))}}

async function solicitarSyncEquipos(){try{const r=await jsonpSeguro({action:"request_sync",pin:ADMIN_PIN},12000);if(!r||!r.ok)throw new Error(r&&r.error||"No confirmado");alert("Orden enviada. Cada equipo reintentará cuando tenga conexión.")}catch(e){alert("No se pudo enviar la orden: "+String(e.message||e))}}
async function cargarDrive(callback){try{const r=await jsonpSeguro({action:"kanban"},20000);window.datosRemotos=r&&r.ok?Array.isArray(r.data)?r.data:[]:[];window.metaReporte=r&&r.meta||{};window.errorReporte=r&&r.ok?"":String(r&&r.error||"")}catch(e){window.errorReporte=String(e.message||e)}if(callback)callback()}
window.addEventListener("online",()=>{procesarPendientesSync(false);reportarEstadoDispositivo(true)});
setInterval(()=>procesarPendientesSync(false),SYNC_PERIODIC_MS);setInterval(()=>reportarEstadoDispositivo(false),DEVICE_HEARTBEAT_MS);setInterval(consultarOrdenes,SIGNAL_POLL_MS);

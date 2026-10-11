function normalizarRegistroLocal(r){
 if(!r||typeof r!=="object")return null;
 const estacion=String(r.estacion||"").trim().toUpperCase();
 let recurso=String(r.recurso||"").trim().toUpperCase();
 if(estacion==="INVENTARIO")recurso=normalizarUbicacion(recurso);
 return {...r,id:String(r.id||r.id_registro||"").trim(),codigo:String(r.codigo||"").trim(),evento:String(r.evento||"").trim().toUpperCase(),fecha_hora:String(r.fecha_hora||r.fechaHora||"").trim(),operador:String(r.operador||"").trim(),estacion,recurso,detalle:String(r.detalle||"").trim().toUpperCase(),sincronizado:r.sincronizado===true,sync_bloqueado:false,sync_intentos:Number(r.sync_intentos||0),sync_ultimo_error:String(r.sync_ultimo_error||""),sync_ultima_fecha:String(r.sync_ultima_fecha||""),eliminado:r.eliminado===true,version:String(r.version||APP_VERSION)};
}
function datos(){
 let raw=[];try{raw=JSON.parse(localStorage.getItem(DB_KEY)||localStorage.getItem(DB_BACKUP_KEY)||"[]")}catch(e){try{raw=JSON.parse(localStorage.getItem(DB_BACKUP_KEY)||"[]")}catch(_){raw=[]}}
 const d=(Array.isArray(raw)?raw:[]).map(normalizarRegistroLocal).filter(Boolean);return d;
}
function guardarDatos(data){const t=JSON.stringify((data||[]).map(normalizarRegistroLocal).filter(Boolean));localStorage.setItem(DB_KEY,t);try{localStorage.setItem(DB_BACKUP_KEY,t)}catch(e){}}
function agregarRegistro(reg){const d=datos();d.unshift(normalizarRegistroLocal(reg));guardarDatos(d)}
function actualizarRegistro(id,patch){const d=datos(),i=d.findIndex(r=>String(r.id)===String(id));if(i>=0){d[i]=normalizarRegistroLocal({...d[i],...patch});guardarDatos(d)}}
function obtenerRegistro(id){return datos().find(r=>String(r.id)===String(id))||null}
function registrosPor(codigo,estacion){return datos().filter(r=>!r.eliminado&&String(r.codigo)===String(codigo)&&r.estacion===estacion).sort((a,b)=>String(a.fecha_hora).localeCompare(String(b.fecha_hora)))}
function ultimoEvento(codigo,estacion){const x=registrosPor(codigo,estacion);return x.length?String(x[x.length-1].evento||"").toUpperCase():""}
function tieneEvento(codigo,estacion,evento){return registrosPor(codigo,estacion).some(r=>r.evento===evento)}
function pendientesSyncOrdenados(){return datos().filter(r=>!r.eliminado&&!r.sincronizado).sort((a,b)=>String(a.fecha_hora).localeCompare(String(b.fecha_hora)))}

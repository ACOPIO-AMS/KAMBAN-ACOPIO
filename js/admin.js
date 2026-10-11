function abrirAdmin(){
  const pin=prompt("PIN Administrador");
  if(pin!==ADMIN_PIN)return alert("PIN incorrecto");
  $("adminModal").classList.remove("hide");
  actualizarAdmin();
  procesarBorradosPendientes();
}
function cerrarAdmin(){$("adminModal").classList.add("hide")}
function actualizarAdmin(){
  const d=datos(),p=d.filter(r=>!r.sincronizado&&!r.eliminado);
  $("adminInfo").textContent=`Versión ${APP_BUILD} | Locales: ${d.length} | Pendientes: ${p.length} | Última sync: ${localStorage.getItem(LAST_SYNC_KEY)||"--"}`;
  if(!$("seleccionBox").classList.contains("hide"))renderSeleccionBorrado();
}
function configurarEquipoActual(){
  const n=prompt("Nombre de este equipo",nombreDispositivo());
  if(n){localStorage.setItem(DEVICE_NAME_KEY,n.trim());reportarEstadoDispositivo(true);actualizarAdmin()}
}
async function probarSincronizacionTodosEquipos(){
  if(!navigator.onLine){alert("Sin conexión. Los registros permanecen guardados y se reintentarán al volver la señal.");return}
  // Este equipo también reintenta sin esperar la señal remota.
  procesarPendientesSync(false);
  try{
    const r=await jsonpSeguro({action:"request_sync",pin:ADMIN_PIN},12000);
    if(!r||r.ok!==true)throw new Error(r&&r.error||"El servidor no confirmó la orden.");
    alert("Orden de sincronización enviada a todos los equipos. Este equipo también inició el reintento.");
  }catch(e){
    alert("Este equipo inició el reintento, pero no se pudo enviar la orden a los demás equipos: "+String(e.message||e));
  }
}
function fechaMs(r){const t=Date.parse(String(r.fecha_hora||"").replace(" ","T"));return Number.isFinite(t)?t:Date.now()}
function limpiezaAutomaticaLocal(){
  const ahora=Date.now(),normales=new Map(),d=datos(),borrar=new Set();
  d.filter(r=>!r.eliminado&&r.estacion!=="INVENTARIO").forEach(r=>{const k=r.estacion+"||"+r.codigo;if(!normales.has(k))normales.set(k,[]);normales.get(k).push(r)});
  d.filter(r=>r.estacion==="INVENTARIO"&&r.sincronizado&&ahora-fechaMs(r)>RETENCION_INVENTARIO_DIAS*86400000).forEach(r=>borrar.add(r.id));
  normales.forEach(rs=>{rs.sort((a,b)=>String(a.fecha_hora).localeCompare(String(b.fecha_hora)));const u=rs[rs.length-1];if(u&&u.evento==="FINAL"&&rs.every(r=>r.sincronizado)&&ahora-fechaMs(u)>RETENCION_LOCAL_DIAS*86400000)rs.forEach(r=>borrar.add(r.id))});
  if(borrar.size){guardarDatos(d.filter(r=>!borrar.has(r.id)));render()}
}
function borrarAnterioresFinalizados(){
  const antes=datos().length;limpiezaAutomaticaLocal();const borrados=antes-datos().length;
  alert(borrados?`Limpieza terminada: ${borrados} registro(s) local(es) vencido(s) eliminados.`:"No hay registros locales vencidos elegibles para limpiar.");
}

const seleccionBorradoIds=new Set();
function recursoAdmin(r){return String(r.recurso||r.ubicacion||"").trim()}
function registrosBorradoVisibles(){
  const filtro=String($("filtroBorrarTexto").value||"").trim().toUpperCase(),estacion=$("filtroBorrarEstacion").value;
  return datos().filter(r=>!r.eliminado).filter(r=>{
    if(estacion&&r.estacion!==estacion)return false;
    return !filtro||[r.codigo,r.evento,r.fecha_hora,r.operador,r.estacion,recursoAdmin(r)].some(x=>String(x||"").toUpperCase().includes(filtro));
  });
}
function actualizarResumenBorrado(){
  const visibles=registrosBorradoVisibles(),marcados=visibles.filter(r=>seleccionBorradoIds.has(String(r.id))).length;
  $("resumenBorrado").textContent=`Mostrados: ${visibles.length} | Seleccionados: ${seleccionBorradoIds.size}`;
  $("seleccionarTodos").checked=visibles.length>0&&marcados===visibles.length;
  $("seleccionarTodos").indeterminate=marcados>0&&marcados<visibles.length;
}
function renderSeleccionBorrado(){
  const rows=registrosBorradoVisibles().map(r=>`<tr><td><input type="checkbox" class="selBorrar" value="${textoTabla(r.id)}" ${seleccionBorradoIds.has(String(r.id))?"checked":""}></td><td>${textoTabla(r.codigo)}</td><td>${textoTabla(r.evento)}</td><td>${textoTabla(r.fecha_hora)}</td><td>${textoTabla(r.estacion)}</td><td>${textoTabla(recursoAdmin(r)||"-")}</td><td class="${r.sincronizado?"ok":"bad"}">${r.sincronizado?"OK":"PEND"}</td></tr>`).join("");
  $("tablaSeleccion").innerHTML="<table><tr><th></th><th>Código</th><th>Evento</th><th>Fecha/Hora</th><th>Estación</th><th>Recurso</th><th>Sync</th></tr>"+rows+"</table>";
  actualizarResumenBorrado();
}
function mostrarBorradoSeleccionados(){
  seleccionBorradoIds.clear();$("filtroBorrarTexto").value="";$("filtroBorrarEstacion").value="";
  $("seleccionBox").classList.toggle("hide");
  if(!$("seleccionBox").classList.contains("hide")){renderSeleccionBorrado();$("seleccionBox").scrollIntoView({block:"start",behavior:"smooth"})}
}
function manejarSeleccionBorrado(e){
  if(!e.target.classList.contains("selBorrar"))return;
  if(e.target.checked)seleccionBorradoIds.add(String(e.target.value));else seleccionBorradoIds.delete(String(e.target.value));
  actualizarResumenBorrado();
}
function manejarSeleccionarTodos(e){
  registrosBorradoVisibles().forEach(r=>{if(e.target.checked)seleccionBorradoIds.add(String(r.id));else seleccionBorradoIds.delete(String(r.id))});
  renderSeleccionBorrado();
}
function leerBorradosAdmin(){try{const x=JSON.parse(localStorage.getItem(DELETE_QUEUE_KEY)||"[]");return Array.isArray(x)?x:[]}catch(e){return[]}}
function guardarBorradosAdmin(x){localStorage.setItem(DELETE_QUEUE_KEY,JSON.stringify(x||[]))}
function encolarBorradosRemotos(regs){
  const mapa=new Map(leerBorradosAdmin().map(x=>[String(x.id),x]));
  regs.filter(r=>r.sincronizado).forEach(r=>mapa.set(String(r.id),{id:String(r.id),estacion:String(r.estacion||"").toUpperCase()}));
  guardarBorradosAdmin([...mapa.values()]);
}
async function procesarBorradosPendientes(){
  if(!navigator.onLine||!endpoint())return;
  const cola=leerBorradosAdmin();if(!cola.length)return;
  for(const x of cola.slice(0,10)){
    try{
      const r=await jsonpSeguro({action:"delete",id:x.id,estacion:x.estacion},8000);
      if(r&&r.ok===true&&String(r.id||"")===String(x.id)){
        const actual=leerBorradosAdmin().filter(y=>String(y.id)!==String(x.id));guardarBorradosAdmin(actual);
      }else break;
    }catch(e){break}
  }
}
function confirmarBorradoSeleccionados(){
  const ids=[...seleccionBorradoIds];if(!ids.length){alert("Seleccione al menos un registro.");return}
  const d=datos(),regs=d.filter(r=>ids.includes(String(r.id))),pend=regs.filter(r=>!r.sincronizado).length,sync=regs.length-pend;
  const aviso=`Seleccionados: ${regs.length}.\nSincronizados: ${sync}.\nPendientes: ${pend}.\n\nLos seleccionados se borrarán de este equipo. Los sincronizados también se solicitarán borrar de la base. ${pend?"ATENCIÓN: los pendientes seleccionados todavía no llegaron a la base.":""}\n\n¿Continuar?`;
  if(!confirm(aviso))return;
  guardarDatos(d.filter(r=>!ids.includes(String(r.id))));
  encolarBorradosRemotos(regs);seleccionBorradoIds.clear();render();actualizarAdmin();renderSeleccionBorrado();procesarBorradosPendientes();
  alert(`Borrado local terminado: ${regs.length} registro(s).`);
}
window.addEventListener("online",procesarBorradosPendientes);

let registrando=false, timerAuto=null;

function cargarPreferencias(){
  $("estacion").value=localStorage.getItem("kamban_estacion")||"BALANZA";
  $("operador").value=localStorage.getItem("kamban_operador")||"";
}
function guardarPreferencias(){
  localStorage.setItem("kamban_estacion",$("estacion").value);
  localStorage.setItem("kamban_operador",$("operador").value);
}
function turnoKey(){
  const d=new Date(); return hoyISO()+"_"+(d.getHours()>=7&&d.getHours()<19?"DIA":"NOCHE");
}
function limpiarOperadorTurno(){
  const k=turnoKey();
  if(localStorage.getItem(LAST_TURN_CLEAR_KEY)!==k){
    localStorage.setItem(LAST_TURN_CLEAR_KEY,k);
    localStorage.removeItem("kamban_operador");
    $("operador").value="";
  }
}
function actualizarModo(){
  const st=$("estacion").value;
  const show=permiteParada(st)||permiteStock(st);
  $("modoBox").style.display=show?"block":"none";
  if(modoEspecial==="PARADA"&&!permiteParada(st)) modoEspecial="NORMAL";
  if((modoEspecial==="EN STOCK"||modoEspecial==="SALIDA STOCK")&&!permiteStock(st)) modoEspecial="NORMAL";
  $("modoParadaBtn").style.display=permiteParada(st)?"block":"none";
  $("modoStockBtn").style.display=permiteStock(st)?"block":"none";
  $("modoSalidaStockBtn").style.display=permiteStock(st)?"block":"none";
  ["modoInicioBtn","modoParadaBtn","modoStockBtn","modoSalidaStockBtn"].forEach(id=>$(id).classList.remove("activo"));
  if(modoEspecial==="NORMAL") $("modoInicioBtn").classList.add("activo");
  if(modoEspecial==="PARADA") $("modoParadaBtn").classList.add("activo");
  if(modoEspecial==="EN STOCK") $("modoStockBtn").classList.add("activo");
  if(modoEspecial==="SALIDA STOCK") $("modoSalidaStockBtn").classList.add("activo");
  $("modoTexto").textContent="Modo: "+(modoEspecial==="NORMAL"?"INICIO":modoEspecial);
}
function seleccionarModo(m){ modoEspecial=m; actualizarModo(); enfocarCodigo(); }

function registrar(){
  if(registrando) return;
  const codigo=$("codigo").value.trim();
  const estacion=$("estacion").value;
  const operador=$("operador").value.trim();
  if(!codigo) return;
  if(!operador){ setEstado("Ingrese operador."); $("operador").focus(); return; }
  registrando=true; setEstado(""); guardarPreferencias();
  let evento=eventoAutomatico(codigo,estacion);
  if((permiteParada(estacion)||permiteStock(estacion)) && modoEspecial!=="NORMAL") evento=modoEspecial;
  const val=validarSecuencia(codigo,estacion,evento);
  if(!val.ok){ alert(val.msg); $("codigo").value=""; registrando=false; enfocarCodigo(); return; }
  const reg={id:uid(),codigo,evento,fecha_hora:fechaHoraLocal(),operador,estacion,sincronizado:false,eliminado:false,version:APP_VERSION};
  agregarRegistro(reg);
  $("codigo").value=""; beepOk();
  if(modoEspecial!=="NORMAL"){ modoEspecial="NORMAL"; actualizarModo(); }
  registrando=false;
  render();
  sincronizar(false);
  enfocarCodigo();
}

function render(){
  $("redEstado").textContent=navigator.onLine?"ONLINE":"OFFLINE";
  const d=datos();
  $("pendientesSync").textContent=d.filter(r=>!r.sincronizado).length;
  const u=ultimoRegistro();
  $("ultimoMin").textContent=u?horaCorta(u.fecha_hora):"--";
  $("ultimoCodigo").textContent=u?u.codigo:"--";
  $("ultimoEvento").textContent=u?(u.evento||"SIN EVENTO"):"--";
  $("ultimoDetalle").textContent=u?`${u.estacion} | ${u.operador} | ${u.fecha_hora}`:"--";

  const p=pendientesPorFinalizar();
  $("pendientesResumen").textContent=p.length?`Total pendientes: ${p.length}`:"Sin pendientes.";
  $("pendientesTabla").innerHTML=p.length?("<table><tr><th>Código</th><th>Estación</th><th>Falta</th><th>Hora</th></tr>"+p.map(x=>`<tr><td>${x.codigo}</td><td>${x.estacion}</td><td><span class='estadoBadge ${x.clase}'>${x.falta}</span></td><td>${horaCorta(x.ultimo)}</td></tr>`).join("")+"</table>"):"";

  const rows=d.slice(0,120).map(r=>{
    const [txt,cls]=estadoRegistro(r);
    return `<tr><td>${r.codigo}</td><td>${r.evento||""}</td><td>${r.fecha_hora}</td><td>${r.operador}</td><td>${r.estacion}</td><td><span class='estadoBadge ${cls}'>${txt}</span></td><td class='${r.sincronizado?"ok":"bad"}'>${r.sincronizado?"OK":"PEND"}</td></tr>`;
  }).join("");
  $("tablaLocal").innerHTML="<table><tr><th>Código</th><th>Evento</th><th>Fecha/Hora</th><th>Operador</th><th>Estación</th><th>Estado</th><th>Sync</th></tr>"+rows+"</table>";
  if(!$("seguimientoModal").classList.contains("hide")) renderSeguimiento();
}

function iniciar(){
  cargarPreferencias(); limpiarOperadorTurno(); actualizarModo(); render(); enfocarCodigo();
  $("codigo").addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); clearTimeout(timerAuto); registrar(); }});
  $("codigo").addEventListener("input",()=>{ clearTimeout(timerAuto); if($("codigo").value.trim()) timerAuto=setTimeout(registrar,AUTO_REGISTER_DELAY_MS); });
  $("operador").addEventListener("input",guardarPreferencias);
  $("estacion").addEventListener("change",()=>{ guardarPreferencias(); actualizarModo(); enfocarCodigo(); });
  $("modoInicioBtn").onclick=()=>seleccionarModo("NORMAL");
  $("modoParadaBtn").onclick=()=>seleccionarModo("PARADA");
  $("modoStockBtn").onclick=()=>seleccionarModo("EN STOCK");
  $("modoSalidaStockBtn").onclick=()=>seleccionarModo("SALIDA STOCK");
  $("seguimientoBtn").onclick=abrirSeguimiento;
  $("cerrarSeguimientoBtn").onclick=cerrarSeguimiento;
  $("actualizarSeguimientoBtn").onclick=()=> navigator.onLine?cargarDrive(renderSeguimiento):renderSeguimiento();
  $("filtroEstado").onchange=renderSeguimiento;
  $("adminBtn").onclick=abrirAdmin;
  $("cerrarAdminBtn").onclick=cerrarAdmin;
  $("probarSyncBtn").onclick=()=>sincronizar(true);
  $("exportarBtn").onclick=exportarCSV;
  $("borradoManualBtn").onclick=borradoManual;
  setInterval(()=>{ limpiarOperadorTurno(); render(); },60000);
}
document.addEventListener("DOMContentLoaded",iniciar);

let registrando=false,timerAuto=null,timerCambioTurno=null;

function normalizarRecurso(v){
  return String(v||"").trim().toUpperCase();
}

function turnoKey(fecha=new Date()){
  const hora=fecha.getHours();
  return hoyISO()+"_"+(hora>=7&&hora<19?"DIA":"NOCHE");
}

function cargarPreferencias(){
  $("estacion").value=localStorage.getItem("kamban_estacion")||"BALANZA";
  $("operador").value=localStorage.getItem("kamban_operador")||"";
}

function guardarPreferencias(){
  localStorage.setItem("kamban_estacion",$("estacion").value);
  localStorage.setItem("kamban_operador",$("operador").value);
}

function limpiarOperadorTurno(){
  const claveActual=turnoKey();
  const claveGuardada=localStorage.getItem(LAST_TURN_CLEAR_KEY);

  if(claveGuardada!==claveActual){
    localStorage.setItem(LAST_TURN_CLEAR_KEY,claveActual);
    localStorage.removeItem("kamban_operador");
    $("operador").value="";
  }
}

function programarLimpiezaCambioTurno(){
  clearTimeout(timerCambioTurno);

  const ahora=new Date();
  const proximo=new Date(ahora);

  if(ahora.getHours()<7){
    proximo.setHours(7,0,0,0);
  }else if(ahora.getHours()<19){
    proximo.setHours(19,0,0,0);
  }else{
    proximo.setDate(proximo.getDate()+1);
    proximo.setHours(7,0,0,0);
  }

  timerCambioTurno=setTimeout(()=>{
    localStorage.removeItem("kamban_operador");
    localStorage.setItem(LAST_TURN_CLEAR_KEY,turnoKey());

    if($("operador")){
      $("operador").value="";
      $("operador").focus();
    }

    programarLimpiezaCambioTurno();
  },Math.max(1000,proximo.getTime()-ahora.getTime()));
}

function configurarRecurso(){
  const estacion=$("estacion").value;
  const box=$("recursoBox");
  const selector=$("recurso");
  const label=$("recursoLabel");

  let maximo=0;
  let titulo="";
  let prefijo="";

  if(estacion==="DESCARGUIO"){
    maximo=4;titulo="N° DE TOLVA";prefijo="T";
  }else if(estacion==="CHANCADO"){
    maximo=4;titulo="N° DE CIRCUITO";prefijo="C";
  }else if(estacion==="SECADO"){
    maximo=10;titulo="N° DE HORNO";prefijo="H";
  }else if(estacion==="PULVERIZADO"){
    maximo=10;titulo="N° DE MOLINO";prefijo="M";
  }

  if(!maximo){
    box.classList.add("hide");
    selector.innerHTML="";
    return;
  }

  box.classList.remove("hide");
  label.textContent=titulo;

  selector.innerHTML=
    '<option value="">Seleccione</option>'+
    Array.from(
      {length:maximo},
      (_,i)=>`<option value="${prefijo}${i+1}">${i+1}</option>`
    ).join("");

  // El recurso nunca queda preseleccionado entre registros.
  // El operario debe confirmarlo en cada lectura para evitar asignaciones accidentales.
  selector.value="";
  localStorage.removeItem("kamban_recurso_"+estacion);
}

function recursoDetalle(r){
  if(r.recurso)return String(r.recurso);
  if(r.estacion==="DESCARGUIO"&&r.tolva)return"T"+r.tolva;
  if(r.estacion==="CHANCADO"&&r.circuito)return"C"+r.circuito;
  if(r.estacion==="SECADO"&&r.horno)return"H"+r.horno;
  if(r.estacion==="PULVERIZADO"&&r.molino)return"M"+r.molino;
  return"";
}

function actualizarModo(){
  const estacion=$("estacion").value;
  const visible=permiteParada(estacion)||permiteStock(estacion);

  $("modoBox").style.display=visible?"block":"none";

  if(modoEspecial==="PARADA"&&!permiteParada(estacion)){
    modoEspecial="NORMAL";
  }

  if(
    (modoEspecial==="EN STOCK"||modoEspecial==="SALIDA STOCK") &&
    !permiteStock(estacion)
  ){
    modoEspecial="NORMAL";
  }

  $("modoParadaBtn").style.display=permiteParada(estacion)?"block":"none";
  $("modoStockBtn").style.display=permiteStock(estacion)?"block":"none";
  $("modoSalidaStockBtn").style.display=permiteStock(estacion)?"block":"none";

  [
    "modoInicioBtn",
    "modoParadaBtn",
    "modoStockBtn",
    "modoSalidaStockBtn"
  ].forEach(id=>$(id).classList.remove("activo"));

  if(modoEspecial==="NORMAL")$("modoInicioBtn").classList.add("activo");
  if(modoEspecial==="PARADA")$("modoParadaBtn").classList.add("activo");
  if(modoEspecial==="EN STOCK")$("modoStockBtn").classList.add("activo");
  if(modoEspecial==="SALIDA STOCK")$("modoSalidaStockBtn").classList.add("activo");

  $("modoTexto").textContent=
    "Modo: "+(modoEspecial==="NORMAL"?"INICIO":modoEspecial);
}

function seleccionarModo(modo){
  modoEspecial=modo;
  actualizarModo();
  enfocarCodigo();
}

function registrar(){
  if(registrando)return;

  const codigo=$("codigo").value.trim();
  const estacion=$("estacion").value;
  const operador=$("operador").value.trim();
  const recurso=normalizarRecurso($("recurso").value);

  if(!codigo)return;

  if(!operador){
  setEstado("Ingrese operador.");

  // Borra el código que se intentó registrar
  $("codigo").value="";

  // Lleva el cursor al campo operador
  $("operador").focus();
  return;
}

  if(
  ["DESCARGUIO","CHANCADO","SECADO","PULVERIZADO"].includes(estacion) &&
  !recurso
){
  setEstado("Seleccione "+$("recursoLabel").textContent+".");

  // Borra el código que intentó registrarse incorrectamente
  $("codigo").value="";

  // Envía el cursor al selector del equipo
  $("recurso").focus();
  return;
}

  registrando=true;
  setEstado("");
  guardarPreferencias();

  let evento=eventoAutomatico(codigo,estacion);

  if(
    (permiteParada(estacion)||permiteStock(estacion)) &&
    modoEspecial!=="NORMAL"
  ){
    evento=modoEspecial;
  }

  const validacion=validarSecuencia(codigo,estacion,evento,recurso);

  if(!validacion.ok){
    alert(validacion.msg);
    $("codigo").value="";
    if(validacion.recursoEsperado&&$("recurso")){
      $("recurso").value="";
      setEstado("Seleccione el recurso correcto: "+validacion.recursoEsperado);
      registrando=false;
      $("recurso").focus();
      return;
    }
    registrando=false;
    enfocarCodigo();
    return;
  }

  const registro={
    id:uid(),
    codigo,
    evento,
    fecha_hora:fechaHoraLocal(),
    operador,
    estacion,
    recurso,
    sincronizado:false,
    eliminado:false,
    version:APP_VERSION
  };

  agregarRegistro(registro);
  $("codigo").value="";

  // Limpiar el recurso después de cada registro confirmado localmente.
  if($("recurso")){
    $("recurso").value="";
    localStorage.removeItem("kamban_recurso_"+estacion);
  }

  beepOk();

  if(modoEspecial!=="NORMAL"){
    modoEspecial="NORMAL";
    actualizarModo();
  }

  registrando=false;
  render();

  // Cada registro activa inmediatamente la cola durable.
  sincronizarRegistroInmediato(registro);
  enfocarCodigo();
}

function render(){
  $("redEstado").textContent=navigator.onLine?"ONLINE":"OFFLINE";

  const registros=datos();
  $("pendientesSync").textContent=
    registros.filter(r=>!r.sincronizado).length;

  const ultimo=ultimoRegistro();

  $("ultimoMin").textContent=
    ultimo?horaCorta(ultimo.fecha_hora):"--";
  $("ultimoCodigo").textContent=
    ultimo?ultimo.codigo:"--";
  $("ultimoEvento").textContent=
    ultimo?(ultimo.evento||"SIN EVENTO"):"--";
  $("ultimoDetalle").textContent=
    ultimo
      ?`${ultimo.estacion}${recursoDetalle(ultimo)?" | "+recursoDetalle(ultimo):""} | ${ultimo.operador} | ${ultimo.fecha_hora}`
      :"--";

  const pendientes=pendientesPorFinalizar();

  $("pendientesResumen").textContent=
    pendientes.length
      ?`Total pendientes: ${pendientes.length}`
      :"Sin pendientes.";

  $("pendientesTabla").innerHTML=
    pendientes.length
      ?"<table><tr><th>Código</th><th>Estación</th><th>Falta</th><th>Hora</th></tr>"+
       pendientes.map(x=>
         `<tr><td>${x.codigo}</td><td>${x.estacion}</td><td><span class="estadoBadge ${x.clase}">${x.falta}</span></td><td>${horaCorta(x.ultimo)}</td></tr>`
       ).join("")+
       "</table>"
      :"";

  const filas=registros.slice(0,120).map(r=>{
    const [texto,clase]=estadoRegistro(r);

    return `<tr>
      <td>${r.codigo}</td>
      <td>${r.evento||""}</td>
      <td>${r.fecha_hora}</td>
      <td>${r.operador}</td>
      <td>${r.estacion}</td>
      <td>${recursoDetalle(r)||"-"}</td>
      <td><span class="estadoBadge ${clase}">${texto}</span></td>
      <td class="${r.sincronizado?"ok":"bad"}">${r.sincronizado?"OK":"PEND"}</td>
    </tr>`;
  }).join("");

  $("tablaLocal").innerHTML=
    "<table><tr><th>Código</th><th>Evento</th><th>Fecha/Hora</th><th>Operador</th><th>Estación</th><th>Recurso</th><th>Estado</th><th>Sync</th></tr>"+
    filas+
    "</table>";

  if(!$("seguimientoModal").classList.contains("hide")){
    renderSeguimiento();
  }
}

function iniciar(){
  cargarPreferencias();
  limpiarOperadorTurno();
  programarLimpiezaCambioTurno();
  configurarRecurso();
  actualizarModo();
  render();
  enfocarCodigo();

  $("codigo").addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      clearTimeout(timerAuto);
      registrar();
    }
  });

  $("codigo").addEventListener("input",()=>{
    clearTimeout(timerAuto);

    if($("codigo").value.trim()){
      timerAuto=setTimeout(registrar,AUTO_REGISTER_DELAY_MS);
    }
  });

  $("operador").addEventListener("input",guardarPreferencias);

  $("estacion").addEventListener("change",()=>{
    guardarPreferencias();
    configurarRecurso();
    actualizarModo();
    enfocarCodigo();
  });

  $("recurso").addEventListener("change",()=>{
  // Garantiza que el campo de escaneo quede vacío
  $("codigo").value="";

  // Limpia el mensaje de error anterior
  setEstado("");

  // Regresa el cursor al campo de escaneo
  enfocarCodigo();
});

  $("modoInicioBtn").onclick=()=>seleccionarModo("NORMAL");
  $("modoParadaBtn").onclick=()=>seleccionarModo("PARADA");
  $("modoStockBtn").onclick=()=>seleccionarModo("EN STOCK");
  $("modoSalidaStockBtn").onclick=()=>seleccionarModo("SALIDA STOCK");

  $("seguimientoBtn").onclick=abrirSeguimiento;
  $("cerrarSeguimientoBtn").onclick=cerrarSeguimiento;
  $("actualizarSeguimientoBtn").onclick=()=>
    navigator.onLine?cargarDrive(renderSeguimiento):renderSeguimiento();
  $("filtroEstado").onchange=renderSeguimiento;

  $("adminBtn").onclick=abrirAdmin;
  $("cerrarAdminBtn").onclick=cerrarAdmin;
  $("probarSyncBtn").onclick=()=>sincronizar(true);
  $("exportarBtn").onclick=exportarCSV;
  $("borrarAnterioresBtn").onclick=borrarAnterioresFinalizados;
  $("borrarSeleccionadosBtn").onclick=mostrarBorradoSeleccionados;
  $("confirmarSeleccionBtn").onclick=confirmarBorradoSeleccionados;

  $("seleccionarTodos").onchange=e=>
    document
      .querySelectorAll(".selBorrar")
      .forEach(x=>x.checked=e.target.checked);

  // Respaldo para cambio de turno y actualización visual.
  setInterval(()=>{
    limpiarOperadorTurno();
    render();
  },60000);

  // Recupera pendientes existentes sin usar funciones inexistentes.
  setTimeout(()=>procesarPendientesSync(false),1000);
}

document.addEventListener("DOMContentLoaded",iniciar);

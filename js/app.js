let registrando=false,timerCambioTurno=null,codigoBloqueado=false;
const INVENTARIO_SERIE_KEY="kamban_inventario_serie";
const INVENTARIO_CANCHA_KEY="kamban_inventario_cancha";
const INVENTARIO_OPERADOR_KEY="kamban_inventario_operador";

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
  $("inventarioSerie").value=localStorage.getItem(INVENTARIO_SERIE_KEY)||"";
  $("inventarioCancha").value=localStorage.getItem(INVENTARIO_CANCHA_KEY)||"";
  if($("estacion").value==="INVENTARIO")$("operador").value=localStorage.getItem(INVENTARIO_OPERADOR_KEY)||$("operador").value;
}

function guardarPreferencias(){
  localStorage.setItem("kamban_estacion",$("estacion").value);
  localStorage.setItem("kamban_operador",$("operador").value);
  if($("estacion").value==="INVENTARIO"){
    localStorage.setItem(INVENTARIO_SERIE_KEY,$("inventarioSerie").value.trim().toUpperCase());
    localStorage.setItem(INVENTARIO_CANCHA_KEY,$("inventarioCancha").value.trim());
    localStorage.setItem(INVENTARIO_OPERADOR_KEY,$("operador").value.trim());
  }
}

function limpiarOperadorTurno(){
  if($("estacion").value==="INVENTARIO")return;
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
    localStorage.setItem(LAST_TURN_CLEAR_KEY,turnoKey());
    if($("estacion").value!=="INVENTARIO"){
      localStorage.removeItem("kamban_operador");
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
    ).join("")+(estacion==="DESCARGUIO"?'<option value="PATIO">PATIO</option>':"");

  selector.value="";
  selector.disabled=false;
  localStorage.removeItem("kamban_recurso_"+estacion);
}

function actualizarRecursoCodigo(){
  const codigo=$("codigo").value.trim(),estacion=$("estacion").value;
  if(!estacionUsaRecurso(estacion))return;
  const asignado=/^\d{5}$/.test(codigo)?recursoAsignadoProceso(codigo,estacion):"";
  const selector=$("recurso");
  if(asignado&&Array.from(selector.options).some(op=>op.value===asignado)){
    selector.value=asignado;
    selector.disabled=true;
  }else{
    if(selector.disabled)selector.value="";
    selector.disabled=false;
  }
  $("recursoBox").querySelector(".note").textContent=asignado
    ?"Recurso recuperado del registro anterior de este lote."
    :"Seleccione recurso para el primer evento de este lote.";
}

function reiniciarCapturaCodigo(){
  codigoBloqueado=false;
}

function rechazarEntradaCodigo(e){
  if(e&&e.preventDefault)e.preventDefault();
  codigoBloqueado=true;
  setEstado($("estacion").value==="INVENTARIO"
    ?"Inventario: ingrese 5 números o una lectura de hasta 80 letras y números."
    :"Solo se permiten 5 dígitos numéricos. Borre y vuelva a ingresar el código.");
}

function codigoTrasInsercion(entrada){
  const campo=$("codigo"),desde=campo.selectionStart??campo.value.length;
  const hasta=campo.selectionEnd??desde;
  return campo.value.slice(0,desde)+entrada+campo.value.slice(hasta);
}

function configurarCamposEspeciales(){
  const estacion=$("estacion").value;
  const mineralBox=$("tipoMineralBox");
  const canchaBox=$("ubicacionMuestreoBox");
  const stockBox=$("motivoStockBox");
  mineralBox.classList.toggle("hide",estacion!=="BALANZA");
  canchaBox.classList.toggle("hide",estacion!=="MUESTREO");
  const esInventario=estacion==="INVENTARIO";
  $("pendientesBox").classList.toggle("hide",esInventario);
  if(esInventario){
    $("inventarioSerie").value=localStorage.getItem(INVENTARIO_SERIE_KEY)||"";
    $("inventarioCancha").value=localStorage.getItem(INVENTARIO_CANCHA_KEY)||"";
    $("operador").value=localStorage.getItem(INVENTARIO_OPERADOR_KEY)||$("operador").value;
  }
  $("inventarioUbicacionBox").classList.toggle("hide",!esInventario);
  $("registrarInventarioBtn").classList.toggle("hide",!esInventario);
  $("codigoLabel").textContent=esInventario?"Lectura de inventario o 5 dígitos manuales":"Código QR / digitado (5 números)";
  $("codigo").inputMode=esInventario?"text":"numeric";
  $("codigo").maxLength=esInventario?80:5;
  $("codigo").pattern=esInventario?"(?:[0-9]{5}|[A-Za-z0-9]{6,80})":"[0-9]{5}";
  stockBox.classList.add("hide");
  if(estacion!=="BALANZA")$("tipoMineral").value="";
  if(estacion!=="BALANZA")$("estadoMineral").value="";
  if(!permiteStock(estacion))$("motivoStock").value="";
  if(estacion!=="MUESTREO"){ $("muestreoSector").value=""; configurarNumeracionMuestreo(); }
}

function configurarMotivoStock(){
  const estacion=$("estacion").value;
  const select=$("motivoStock");
  if(estacion==="MUESTREO"){
    select.innerHTML='<option value="">Seleccione</option><option value="EP">ESPERA PROVEEDOR (EP)</option><option value="MC">MUESTREO EN CONJUNTO (MC)</option>';
  }else{
    select.innerHTML='<option value="">Seleccione</option><option value="LOTE HUMEDO">LOTE HUMEDO</option><option value="ESPERA PROVEEDOR">ESPERA PROVEEDOR</option>';
  }
}

function configurarNumeracionMuestreo(){
  const sector=$("muestreoSector").value;
  const numero=$("muestreoNumero");

  if(sector==="PLANTA"){
    numero.value="";
    numero.classList.add("hide");
    return;
  }

  numero.classList.remove("hide");
  numero.disabled=false;
  numero.innerHTML='<option value="">N°</option>'+Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
  numero.value="";
}

function ubicacionMuestreoActual(){
  const sector=$("muestreoSector").value;
  if(!sector)return "";
  if(sector==="PLANTA")return "PLANTA";
  const numero=$("muestreoNumero").value;
  return numero?`${numero} ${sector}`:"";
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
  $("modoSalidaStockBtn").style.display=estacion==="DESCARGUIO"?"block":"none";
  $("motivoStockBox").classList.toggle("hide",!(permiteStock(estacion)&&modoEspecial==="EN STOCK"));

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
  if(modo==="EN STOCK")$("motivoStock").focus();
  else enfocarCodigo();
}

function avisarNoRegistrado(mensaje,elemento){
  const texto="NO SE REGISTRÓ EL EVENTO.\n\n"+mensaje;
  setEstado(texto);
  $("codigo").value="";
  reiniciarCapturaCodigo();
  actualizarRecursoCodigo();
  alert(texto);
  if(elemento)elemento.focus();
}

function pedirDatoPendiente(mensaje,elemento){
  setEstado("Código listo. "+mensaje);
  if(elemento)elemento.focus();
}

function completarRegistroPendiente(){
  if(!codigoBloqueado&&/^\d{5}$/.test($("codigo").value)&&!registrando)registrar();
}

function registrarInventario(){
  if(registrando)return;
  const lectura=$("codigo").value.trim(),codigo=extraerCodigoInventario(lectura),operador=$("operador").value.trim();
  const serie=$("inventarioSerie").value.trim().toUpperCase();
  const cancha=$("inventarioCancha").value.trim();
  if(!/^(?:\d{5}|[A-Za-z0-9]{6,80})$/.test(lectura)){
    setEstado("Inventario: ingrese 5 números o lea el código alfanumérico completo.");
    $("codigo").focus();return;
  }
  if(!codigo){
    setEstado("Inventario: la lectura larga debe contener un único código PPO seguido de 5 dígitos.");
    $("codigo").focus();return;
  }
  if(!operador){pedirDatoPendiente("Ingrese el operador.",$("operador"));return;}
  if(!/^[ABC]$/.test(serie)){pedirDatoPendiente("Seleccione la serie de cancha: A, B o C.",$("inventarioSerie"));return;}
  if(!/^[1-8]$/.test(cancha)){pedirDatoPendiente("Seleccione un número de cancha del 1 al 8.",$("inventarioCancha"));return;}
  const lote=codigo.slice(-5);
  const registro={id:uid(),codigo,evento:"LECTURA",fecha_hora:fechaHoraLocal(),operador,
    estacion:"INVENTARIO",recurso:`${serie}-${cancha}`,detalle:lote,lectura_original:lectura,
    serie,cancha,sincronizado:false,eliminado:false,version:APP_VERSION};
  registrando=true;
  try{agregarRegistro(registro)}catch(error){
    registrando=false;pedirDatoPendiente("No se pudo guardar en este dispositivo: "+String(error.message||error),$("codigo"));return;
  }
  guardarPreferencias();
  $("codigo").value="";reiniciarCapturaCodigo();registrando=false;
  render();setEstado(`Inventario guardado: ${codigo} | cancha ${serie}-${cancha}. Pendiente de confirmación en la base.`);
  beepOk();sincronizarRegistroInmediato(registro);enfocarCodigo();
}

function registrar(){
  if(registrando)return;
  if($("estacion").value==="INVENTARIO"){registrarInventario();return;}

  const codigo=$("codigo").value.trim();
  const estacion=$("estacion").value;
  const operador=$("operador").value.trim();
  const recursoEquipo=normalizarRecurso($("recurso").value);
  const tipo=$("tipoMineral").value.trim().toUpperCase();
  const estadoMineral=$("estadoMineral").value.trim().toUpperCase();
  const tipoMineral=tipo&&estadoMineral?`${tipo} - ${estadoMineral}`:"";
  const motivoStock=$("motivoStock").value.trim().toUpperCase();
  const ubicacionElegida=ubicacionMuestreoActual();
  let ubicacion=ubicacionElegida;
  // BALANZA y MUESTREO también guardan su dato operativo en la columna RECURSO.
  let recurso=estacion==="BALANZA"?tipoMineral:(estacion==="MUESTREO"?ubicacion:recursoEquipo);

  if(!codigo)return;
  if(!/^\d{5}$/.test(codigo)){
    avisarNoRegistrado("El código debe tener exactamente 5 dígitos numéricos.",$("codigo"));
    return;
  }
  if(estacionUsaRecurso(estacion))recurso=recursoAsignadoProceso(codigo,estacion)||recurso;

  if(!operador){
  pedirDatoPendiente("Ingrese el operador para registrar.",$("operador"));
  return;
}

  if(estacion==="BALANZA"&&!tipoMineral){
    pedirDatoPendiente("Seleccione el tipo y estado del mineral.",tipo?$("estadoMineral"):$("tipoMineral"));
    return;
  }

  if(
  ["DESCARGUIO","CHANCADO","SECADO","PULVERIZADO"].includes(estacion) &&
  !recurso && !(estacion==="DESCARGUIO"&&modoEspecial!=="NORMAL")
){
  pedirDatoPendiente("Seleccione "+$("recursoLabel").textContent+" para registrar.",$("recurso"));
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

  // En MUESTREO, con el modo INICIO se registra automáticamente SALIDA STOCK
  // cuando el último evento del lote quedó EN STOCK.
  if(estacion==="MUESTREO"&&modoEspecial==="NORMAL"){
    evento=eventoAutomatico(codigo,estacion);
  }

  if(estacion==="MUESTREO"){
    const ubicacionFijada=ubicacionMuestreoAsignada(codigo);
    if(!ubicacionElegida&&!ubicacionFijada){
      pedirDatoPendiente("Seleccione la ubicación de muestreo para la RECEPCIÓN.",$("muestreoSector").value?$("muestreoNumero"):$("muestreoSector"));
      registrando=false;
      return;
    }
    if(ubicacionElegida&&ubicacionFijada&&ubicacionElegida!==ubicacionFijada){
      avisarNoRegistrado(`La ubicación debe ser ${ubicacionFijada}, igual que la RECEPCIÓN.`, $("muestreoSector"));
      registrando=false;
      return;
    }
    ubicacion=ubicacionFijada||ubicacionElegida;
    recurso=ubicacion;
  }

  if(estacion==="DESCARGUIO"&&evento==="EN STOCK"&&!motivoStock){
    pedirDatoPendiente("Seleccione el motivo de stock para registrar.",$("motivoStock"));
    registrando=false;
    return;
  }
  if(estacion==="MUESTREO"&&evento==="EN STOCK"&&!motivoStock){
    pedirDatoPendiente("Seleccione el motivo de stock para registrar.",$("motivoStock"));
    registrando=false;
    return;
  }

  if(estacion==="MUESTREO"&&evento==="EN STOCK")recurso=`${ubicacion} STOCK ${motivoStock}`;
  if(estacion==="MUESTREO"&&evento==="SALIDA STOCK")recurso=`${ubicacion} SALIDA STOCK`;

  const validacion=validarSecuencia(codigo,estacion,evento,recurso);

  if(!validacion.ok){
    avisarNoRegistrado(validacion.msg);
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
    detalle:permiteStock(estacion)&&evento==="EN STOCK"?motivoStock:"",
    sincronizado:false,
    eliminado:false,
    version:APP_VERSION
  };

  try{
    agregarRegistro(registro);
  }catch(error){
    registrando=false;
    pedirDatoPendiente("No se pudo guardar en este dispositivo: "+String(error.message||error),$("codigo"));
    return;
  }
  $("codigo").value="";
  reiniciarCapturaCodigo();

  // Limpiar el recurso después de cada registro confirmado localmente.
  if($("recurso")){
    $("recurso").value="";
    $("recurso").disabled=false;
    localStorage.removeItem("kamban_recurso_"+estacion);
  }
  actualizarRecursoCodigo();
  if(estacion==="BALANZA"){ $("tipoMineral").value=""; $("estadoMineral").value=""; }
  if(permiteStock(estacion))$("motivoStock").value="";
  if(estacion==="MUESTREO"){ $("muestreoSector").value=""; configurarNumeracionMuestreo(); }

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
    ultimo?(ultimo.estacion==="INVENTARIO"?(ultimo.detalle||String(ultimo.codigo||"").slice(-5)):(ultimo.evento||"SIN EVENTO")):"--";
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
      ?"<table><tr><th>Código</th><th>Estación</th><th>Recurso</th><th>Falta</th><th>Hora</th></tr>"+
       pendientes.map(x=>
         `<tr><td>${textoTabla(x.codigo)}</td><td>${textoTabla(x.estacion)}</td><td>${textoTabla(x.recurso||"—")}</td><td><span class="estadoBadge ${x.clase}">${textoTabla(x.falta)}</span></td><td>${textoTabla(horaCorta(x.ultimo))}</td></tr>`
       ).join("")+
       "</table>"
      :"";

  const tiemposPorFinal=new Map(calcularTiemposProceso(registros)
    .filter(t=>t.finId).map(t=>[t.finId,t]));
  const filas=registros.slice(0,120).map(r=>{
    const [texto,clase]=estadoRegistro(r);
    const t=tiemposPorFinal.get(String(r.id));

    return `<tr>
      <td>${textoTabla(r.codigo)}</td>
      <td>${textoTabla(r.estacion==="INVENTARIO"?(r.detalle||String(r.codigo||"").slice(-5)):(r.evento||""))}</td>
      <td>${textoTabla(r.fecha_hora)}</td>
      <td>${textoTabla(r.operador)}</td>
      <td>${textoTabla(r.estacion)}</td>
      <td>${textoTabla(recursoDetalle(r)||"-")}</td>
      <td>${t?relojDuracion(t.espera):"—"}</td>
      <td>${t?relojDuracion(t.parada):"—"}</td>
      <td>${t?relojDuracion(t.proceso):"—"}</td>
      <td>${t?relojDuracion(t.permanencia):"—"}</td>
      <td><span class="estadoBadge ${clase}">${texto}</span></td>
      <td class="${r.sincronizado?"ok":"bad"}">${r.sincronizado?"OK":"PEND"}</td>
    </tr>`;
  }).join("");

  $("tablaLocal").innerHTML=
    "<table><tr><th>Código</th><th>Evento</th><th>Fecha/Hora</th><th>Operador</th><th>Estación</th><th>Recurso</th><th>Espera</th><th>Paradas</th><th>Proceso</th><th>Permanencia</th><th>Estado</th><th>Sync</th></tr>"+
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
  configurarNumeracionMuestreo();
  configurarMotivoStock();
  configurarCamposEspeciales();
  actualizarModo();
  render();
  enfocarCodigo();

  $("codigo").addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      if(codigoBloqueado)return;
      if($("estacion").value==="INVENTARIO"){registrarInventario();return;}
      if(/^\d{5}$/.test($("codigo").value))registrar();
    }
  });

  $("codigo").addEventListener("beforeinput",e=>{
    if(!e.inputType||!e.inputType.startsWith("insert")||e.inputType==="insertFromPaste")return;
    const proximo=codigoTrasInsercion(e.data||"");
    if(e.data!=null&&!($("estacion").value==="INVENTARIO"?/^[A-Za-z0-9]{0,80}$/:/^\d{0,5}$/).test(proximo))rechazarEntradaCodigo(e);
  });

  $("codigo").addEventListener("paste",e=>{
    const texto=e.clipboardData&&e.clipboardData.getData("text");
    if(texto!=null&&!($("estacion").value==="INVENTARIO"?/^[A-Za-z0-9]{0,80}$/:/^\d{0,5}$/).test(codigoTrasInsercion(texto)))rechazarEntradaCodigo(e);
  });

  $("codigo").addEventListener("input",()=>{
    const campo=$("codigo"),valor=campo.value;
    if($("estacion").value==="INVENTARIO"){
      if(!/^[A-Za-z0-9]{0,80}$/.test(valor)){campo.value=valor.replace(/[^A-Za-z0-9]/g,"").slice(0,80);rechazarEntradaCodigo();return;}
      codigoBloqueado=false;
      setEstado(valor?"Lectura lista. Pulse REGISTRAR o use Enter al terminar el escaneo.":"");
      return;
    }
    if(!/^\d{0,5}$/.test(valor)){
      campo.value=valor.replace(/\D/g,"").slice(0,5);
      rechazarEntradaCodigo();
      actualizarRecursoCodigo();
      return;
    }
    codigoBloqueado=false;
    const codigo=valor;
    actualizarRecursoCodigo();
    if(!codigo){reiniciarCapturaCodigo();setEstado("");return;}
    if(codigo.length<5){
      setEstado(`Código incompleto: ${codigo.length}/5 dígitos.`);
    }else{
      registrar();
    }
  });

  $("operador").addEventListener("input",guardarPreferencias);
  $("inventarioSerie").addEventListener("change",guardarPreferencias);
  $("inventarioCancha").addEventListener("change",guardarPreferencias);
  $("operador").addEventListener("change",completarRegistroPendiente);
  $("registrarInventarioBtn").onclick=registrarInventario;

  $("estacion").addEventListener("change",()=>{
    $("codigo").value="";
    reiniciarCapturaCodigo();
    localStorage.setItem("kamban_estacion",$("estacion").value);
    configurarRecurso();
    configurarCamposEspeciales();
    configurarMotivoStock();
    actualizarModo();
    enfocarCodigo();
  });

  $("tipoMineral").addEventListener("change",completarRegistroPendiente);
  $("estadoMineral").addEventListener("change",completarRegistroPendiente);
  $("motivoStock").addEventListener("change",completarRegistroPendiente);
  $("muestreoSector").addEventListener("change",()=>{ configurarNumeracionMuestreo(); completarRegistroPendiente(); });
  $("muestreoNumero").addEventListener("change",completarRegistroPendiente);

  $("recurso").addEventListener("change",()=>{
    if(/^\d{5}$/.test($("codigo").value))completarRegistroPendiente();
    else{setEstado("");enfocarCodigo();}
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
  $("solicitarSyncEquiposBtn").onclick=()=>solicitarSyncEquipos(true);
  $("solicitarActualizacionEquiposBtn").onclick=()=>solicitarActualizacionEquipos();
  $("configurarEquipoBtn").onclick=configurarEquipoActual;
  $("actualizarControlBtn").onclick=actualizarControlDispositivos;
  $("exportarBtn").onclick=exportarCSV;
  $("borrarAnterioresBtn").onclick=borrarAnterioresFinalizados;
  $("borrarSeleccionadosBtn").onclick=mostrarBorradoSeleccionados;
  $("confirmarSeleccionBtn").onclick=confirmarBorradoSeleccionados;

  $("filtroBorrarTexto").addEventListener("input",renderSeleccionBorrado);
  $("filtroBorrarEstacion").addEventListener("change",renderSeleccionBorrado);
  $("tablaSeleccion").addEventListener("change",e=>{
    if(!e.target.classList.contains("selBorrar"))return;
    if(e.target.checked)seleccionBorradoIds.add(e.target.value);
    else seleccionBorradoIds.delete(e.target.value);
    actualizarResumenBorrado();
  });
  $("seleccionarTodos").onchange=e=>{
    registrosBorradoVisibles().forEach(r=>{
      if(e.target.checked)seleccionBorradoIds.add(r.id);
      else seleccionBorradoIds.delete(r.id);
    });
    renderSeleccionBorrado();
  };

  // Respaldo para cambio de turno y actualización visual.
  setInterval(()=>{
    limpiarOperadorTurno();
    render();
  },60000);

  // Recupera pendientes existentes sin usar funciones inexistentes.
  setTimeout(()=>procesarPendientesSync(false),1000);
  setTimeout(()=>limpiezaAutomaticaLocal(),2500);
  setInterval(()=>limpiezaAutomaticaLocal(),60*60*1000);
}

document.addEventListener("DOMContentLoaded",iniciar);

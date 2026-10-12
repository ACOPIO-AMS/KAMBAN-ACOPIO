let registrando=false,modoEspecial="NORMAL";
const SEGMENTOS=["A","B","C","4","5","6","7","8","9","10"];
function turnoActual(){const d=new Date();if(d.getHours()<7)d.setDate(d.getDate()-1);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${d.getHours()>=19||d.getHours()<7?"N":"D"}`;}
function verificarCambioTurno(){const t=turnoActual(),prev=localStorage.getItem("kamban_turno_actual");if(prev&&prev!==t){localStorage.removeItem("kamban_estacion");localStorage.removeItem("kamban_operador");$("estacion").value="BALANZA";$("operador").value="";configurarRecurso();configurarCampos();limpiarRecursosFormulario();}localStorage.setItem("kamban_turno_actual",t)}
function limpiarRecursosFormulario(){if($("recurso"))$("recurso").value="";["muestreoNumero","muestreoSegmento","balanzaTipo","balanzaEstado","motivoStock"].forEach(id=>{if($(id))$(id).value=""});}
function guardarPreferencias(){localStorage.setItem("kamban_estacion",$("estacion").value);localStorage.setItem("kamban_operador",$("operador").value);localStorage.setItem("kamban_inv_num",$("inventarioNumero").value);localStorage.setItem("kamban_inv_seg",$("inventarioSegmento").value);}
function cargarPreferencias(){$("estacion").value=localStorage.getItem("kamban_estacion")||"BALANZA";$("operador").value=localStorage.getItem("kamban_operador")||"";$("inventarioNumero").value=localStorage.getItem("kamban_inv_num")||"";$("inventarioSegmento").value=localStorage.getItem("kamban_inv_seg")||""}
function configurarRecurso(){const e=$("estacion").value,b=$("recursoBox"),s=$("recurso");let opts=[],label="Recurso";if(e==="DESCARGUIO"){opts=["T1","T2","T3","T4","PATIO"];label="N° DE TOLVA"}else if(e==="CHANCADO"){opts=["C1","C2","C3","C4"];label="N° DE CIRCUITO"}else if(e==="SECADO"){opts=Array.from({length:10},(_,i)=>"H"+(i+1));label="N° DE HORNO"}else if(e==="PULVERIZADO"){opts=Array.from({length:10},(_,i)=>"M"+(i+1));label="N° DE MOLINO"}if(!opts.length){b.classList.add("hide");s.innerHTML="";return}b.classList.remove("hide");$("recursoLabel").textContent=label;s.innerHTML='<option value="">Seleccione</option>'+opts.map(x=>`<option value="${x}">${x.replace(/^[TCHM]/,"")}</option>`).join("")}
function actualizarMotivoStock(){const mostrar=$("estacion").value==="DESCARGUIO"&&($("recurso").value==="PATIO"||modoEspecial==="EN STOCK");$("motivoStockBox").classList.toggle("hide",!mostrar);if(!mostrar)$("motivoStock").value=""}
function configurarCampos(){const e=$("estacion").value;$("inventarioUbicacionBox").classList.toggle("hide",e!=="INVENTARIO");$("balanzaMineralBox").classList.toggle("hide",e!=="BALANZA");$("ubicacionMuestreoBox").classList.toggle("hide",e!=="MUESTREO");$("modoBox").classList.toggle("hide",e==="INVENTARIO");$("registrarInventarioBtn").classList.toggle("hide",e!=="INVENTARIO");$("pendientesBox").classList.toggle("hide",e==="INVENTARIO");$("codigoLabel").textContent=e==="INVENTARIO"?`Lectura de inventario / QR extenso (máx. ${QR_INVENTARIO_MAX} caracteres)`:"Código QR / digitado (5 números)";$("codigo").maxLength=e==="INVENTARIO"?QR_INVENTARIO_MAX:5;$("codigo").inputMode=e==="INVENTARIO"?"text":"numeric";actualizarModo();actualizarVisibilidadRecurso()}
function actualizarModo(){const e=$("estacion").value,visible=e!=="INVENTARIO";$("modoParadaBtn").classList.toggle("hide",!(e==="CHANCADO"||e==="DESCARGUIO"));$("modoStockBtn").classList.toggle("hide",!(e==="DESCARGUIO"||e==="MUESTREO"));$("modoSalidaStockBtn").classList.toggle("hide",!(e==="DESCARGUIO"||e==="MUESTREO"));["modoInicioBtn","modoParadaBtn","modoStockBtn","modoSalidaStockBtn"].forEach(id=>$(id).classList.remove("activo"));const m={NORMAL:"modoInicioBtn",PARADA:"modoParadaBtn","EN STOCK":"modoStockBtn","SALIDA STOCK":"modoSalidaStockBtn"}[modoEspecial];if(m)$(m).classList.add("activo");$("modoTexto").textContent="Modo: "+(modoEspecial==="NORMAL"?"INICIO":modoEspecial);actualizarVisibilidadRecurso()}
function seleccionarModo(m){modoEspecial=m;actualizarModo();actualizarVisibilidadRecurso();$("codigo").focus()}
function ubicacionMuestreoActual(){const n=$("muestreoNumero").value,s=$("muestreoSegmento").value;return n!==""&&s?`${n} ${s}`:""}
function ubicacionMuestreoAsignada(codigo){const r=registrosPor(codigo,"MUESTREO").find(x=>x.evento==="RECEPCION");return r?normalizarUbicacion(r.recurso):""}
function registroOrigenProceso(codigo,estacion){
 const regs=registrosPor(codigo,estacion);
 // Usar el INICIO más reciente, aunque aún esté pendiente de sincronización.
 return regs.slice().reverse().find(r=>r.evento==="INICIO")||null;
}
function motivoDeRecurso(recurso){
 const v=String(recurso||"");const pos=v.indexOf(" - ");
 return pos>=0?v.slice(pos+3).trim():"";
}
function recursoBase(recurso){return String(recurso||"").split(" - ")[0].trim()}
function recursoConMotivo(recurso,motivo){
 const base=recursoBase(recurso),m=String(motivo||"").trim();
 return m&&base?`${base} - ${m}`:base;
}
function motivoDeOrigen(codigo,e){
 const origen=registroOrigenProceso(codigo,e);
 if(!origen)return "";
 return motivoDeRecurso(origen.recurso)||(origen.detalle&&origen.detalle!=="STOCK"?origen.detalle:"");
}
function recursoPara(codigo,e,evento){
 const origen=registroOrigenProceso(codigo,e);
 if(evento==="RECEPCION")return "";
 let base="";
 if(evento!=="INICIO"&&origen)base=origen.recurso||"";
 else if(evento!=="INICIO")base=recursoAsignadoProceso(codigo,e)||($('recurso')?$('recurso').value:"");
 else if(e==="BALANZA"){
   const t=$('balanzaTipo').value,estado=$('balanzaEstado').value;
   base=t&&estado?`${t} - ${estado}`:"";
 }else if(e==="MUESTREO")base=ubicacionMuestreoActual();
 else base=$('recurso')?$('recurso').value:"";
 if(e!=="DESCARGUIO")return base;
 // Conservar el recurso compuesto si ya estaba registrado en INICIO.
 const previo=motivoDeRecurso(base)||motivoDeOrigen(codigo,e);
 const nuevo=$('motivoStock').value;
 if(evento==="INICIO")return recursoBase(base)==="PATIO"?recursoConMotivo(base,nuevo):base;
 if(evento==="EN STOCK")return recursoConMotivo(base,previo||nuevo);
 return recursoConMotivo(base,previo);
}
function detallePara(codigo,e,evento,recurso){
 if(e!=="DESCARGUIO")return "";
 // Mantener el motivo en DETALLE por compatibilidad; el dato oficial
 // completo se almacena también en RECURSO.
 return motivoDeRecurso(recurso)||motivoDeOrigen(codigo,e)||$('motivoStock').value||"";
}
function actualizarVisibilidadRecurso(){
 const e=$("estacion").value, codigo=$("codigo").value.trim();
 const evento=e==="INVENTARIO"?"LECTURA":(modoEspecial!=="NORMAL"?modoEspecial:(/^\d{5}$/.test(codigo)?eventoAutomatico(codigo,e):reglasEstacion(e)[0]));
 const pedir=evento==="INICIO";
 $("recursoBox").classList.toggle("hide",!(pedir&&["DESCARGUIO","CHANCADO","SECADO","PULVERIZADO"].includes(e)));
 $("balanzaMineralBox").classList.toggle("hide",!(e==="BALANZA"&&pedir));
 $("ubicacionMuestreoBox").classList.toggle("hide",!(e==="MUESTREO"&&pedir));
 const origen=registroOrigenProceso(codigo,e);
 const recurso=pedir?$("recurso").value:(origen?origen.recurso:"");
 const motivoPrevio=motivoDeOrigen(codigo,e);
 const stock=e==="DESCARGUIO"&&((evento==="EN STOCK"&&!motivoPrevio)||(pedir&&recursoBase(recurso)==="PATIO"));
 $("motivoStockBox").classList.toggle("hide",!stock);
 if(!stock)$("motivoStock").value="";
}
function nuevoRegistro(codigo,evento,estacion,recurso,operador,detalle=""){return{id:uid(),codigo,evento,fecha_hora:fechaHoraLocal(),operador,estacion,recurso,detalle,sincronizado:false,sync_intentos:0,sync_ultimo_error:"",eliminado:false,version:APP_VERSION}}
function guardarYEnviar(regs){const d=datos();regs.slice().reverse().forEach(r=>d.unshift(r));guardarDatos(d);render();regs.forEach(r=>sincronizarRegistroInmediato(r));beepOk()}
function registrarInventario(){if(registrando)return;const lectura=$("codigo").value.trim(),operador=$("operador").value.trim(),numero=$("inventarioNumero").value,segmento=$("inventarioSegmento").value;const codigo=extraerCodigoInventario(lectura);if(!lectura||lectura.length>QR_INVENTARIO_MAX)return setEstado(`Lectura inválida o mayor a ${QR_INVENTARIO_MAX} caracteres.`);if(!codigo)return setEstado("No se encontró un único código PPO seguido de 5 dígitos. También puede digitar solo 5 números.");if(!operador)return setEstado("Ingrese operador.");const ubicacion=`${numero} ${segmento}`;if(!esUbicacionValida(ubicacion))return setEstado("Seleccione ubicación: número 0–10 y segmento A/B/C/4…10. Ejemplo: 3 A.");registrando=true;const r=nuevoRegistro(codigo,"LECTURA","INVENTARIO",ubicacion,operador,codigo.slice(-5));r.lectura_original=lectura;guardarYEnviar([r]);guardarPreferencias();$("codigo").value="";setEstado(`Inventario guardado: ${codigo} | ubicación ${ubicacion}.`);registrando=false;$("codigo").focus()}
function registrarNormal(){
 if(registrando)return;
 const codigo=$("codigo").value.trim(),e=$("estacion").value,operador=$("operador").value.trim();
 if(!/^\d{5}$/.test(codigo))return setEstado("El código debe tener exactamente 5 números.");
 if(!operador)return setEstado("Ingrese operador.");
 let evento=eventoAutomatico(codigo,e);
 if(modoEspecial!=="NORMAL")evento=modoEspecial;
 if(!evento)return setEstado("El lote ya completó los eventos de esta estación.");
 const origen=registroOrigenProceso(codigo,e);
 const recurso=recursoPara(codigo,e,evento);
 // Solo INICIO exige recurso; RECEPCION y eventos posteriores lo heredan.
 if(evento==="INICIO"){
   if(["BALANZA","DESCARGUIO","CHANCADO","MUESTREO","SECADO","PULVERIZADO"].includes(e)&&!recurso)
     return setEstado("Seleccione el recurso para INICIO.");
   if(e==="BALANZA"&&(!$("balanzaTipo").value||!$("balanzaEstado").value))
     return setEstado("Seleccione tipo y estado del mineral.");
 }
 // PATIO exige motivo al iniciar; EN STOCK manual exige motivo si no se heredó.
 const motivo=detallePara(codigo,e,evento,recurso);
 if(e==="DESCARGUIO"&&((evento==="INICIO"&&recursoBase(recurso)==="PATIO")||evento==="EN STOCK")&&!motivo)
   return setEstado("Seleccione el motivo de stock.");
 const v=validarSecuencia(codigo,e,evento,recurso);
 if(!v.ok)return setEstado(v.msg);
 registrando=true;
 const regs=[nuevoRegistro(codigo,evento,e,recurso,operador,motivo||(evento==="EN STOCK"?"STOCK":""))];
 if(e==="DESCARGUIO"&&recursoBase(recurso)==="PATIO"&&evento==="FINAL"){
   const stock=nuevoRegistro(codigo,"EN STOCK",e,recurso,operador,motivo);
   stock.fecha_hora=fechaHoraLocal(new Date(Date.now()+1000));
   regs.push(stock);
 }
 guardarYEnviar(regs);
 limpiarRecursosFormulario();
 $("codigo").value="";
 modoEspecial="NORMAL";
 actualizarModo();
 actualizarVisibilidadRecurso();
 setEstado(regs.length===2?`${codigo}: FINAL + EN STOCK registrados automáticamente en PATIO.`:`${codigo}: ${evento} registrado.`);
 registrando=false;$("codigo").focus();
}
function registrar(){return $("estacion").value==="INVENTARIO"?registrarInventario():registrarNormal()}
function estadoRegistro(r){if(r.sincronizado)return"OK";return r.sync_ultimo_error?"PEND / "+r.sync_ultimo_error:"PEND"}
function render(){const d=datos();$("redEstado").textContent=navigator.onLine?"ONLINE":"OFFLINE";$("pendientesSync").textContent=d.filter(r=>!r.sincronizado&&!r.eliminado).length;const u=d.find(r=>!r.eliminado);$("ultimoMin").textContent=u?horaCorta(u.fecha_hora):"--";$("ultimoCodigo").textContent=u?u.codigo:"--";$("ultimoEvento").textContent=u?u.evento:"--";$("ultimoDetalle").textContent=u?`${u.estacion} | ${u.recurso||"-"} | ${u.operador} | ${u.fecha_hora}`:"--";const p=pendientesPorFinalizar();$("pendientesResumen").textContent=p.length?`Total pendientes: ${p.length}`:"Sin pendientes.";$("pendientesTabla").innerHTML=p.length?"<table><tr><th>Código</th><th>Estación</th><th>Recurso</th><th>Falta</th><th>Hora</th></tr>"+p.map(x=>`<tr><td>${textoTabla(x.codigo)}</td><td>${textoTabla(x.estacion)}</td><td>${textoTabla(x.recurso||"-")}</td><td>${textoTabla(x.falta)}</td><td>${textoTabla(horaCorta(x.ultimo))}</td></tr>`).join("")+"</table>":"";const tm=new Map(calcularTiemposProceso(d).map(x=>[String(x.finId),x]));$("tablaLocal").innerHTML="<table><tr><th>Código</th><th>Evento</th><th>Fecha/Hora</th><th>Operador</th><th>Estación</th><th>Recurso</th><th>Espera</th><th>Paradas</th><th>Proceso</th><th>Permanencia</th><th>Sync</th></tr>"+d.slice(0,150).map(r=>{const t=tm.get(r.id);return`<tr><td>${textoTabla(r.codigo)}</td><td>${textoTabla(r.evento)}</td><td>${textoTabla(r.fecha_hora)}</td><td>${textoTabla(r.operador)}</td><td>${textoTabla(r.estacion)}</td><td>${textoTabla(r.recurso||"-")}</td><td>${t?minutosDuracion(t.espera):"—"}</td><td>${t&&t.tuvoParada?minutosDuracion(t.parada):""}</td><td>${t?minutosDuracion(t.proceso):"—"}</td><td>${t?minutosDuracion(t.permanencia):"—"}</td><td class='${r.sincronizado?"ok":"bad"}'>${textoTabla(estadoRegistro(r))}</td></tr>`}).join("")+"</table>";if($("adminModal")&&!$("adminModal").classList.contains("hide"))actualizarAdmin()}
function iniciar(){cargarPreferencias();verificarCambioTurno();setInterval(verificarCambioTurno,30000);configurarRecurso();configurarCampos();render();$("estacion").onchange=()=>{$("codigo").value="";configurarRecurso();configurarCampos();guardarPreferencias();$("codigo").focus()};$("operador").oninput=guardarPreferencias;$("recurso").addEventListener("change",()=>{actualizarVisibilidadRecurso();if($("codigo").value.length===5&&$("recurso").value!=="PATIO")registrarNormal()});$("motivoStock").addEventListener("change",()=>{if($("motivoStock").value&&$("codigo").value.length===5)registrarNormal()});["balanzaTipo","balanzaEstado","muestreoNumero","muestreoSegmento"].forEach(id=>$(id).addEventListener("change",()=>{if($("codigo").value.length===5)registrarNormal()}));[$("inventarioNumero"),$("inventarioSegmento")].forEach(x=>x.onchange=guardarPreferencias);$("registrarInventarioBtn").onclick=registrarInventario;$("codigo").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.stopPropagation();registrar()}});$("codigo").addEventListener("input",()=>{if($("estacion").value!=="INVENTARIO"){const v=$("codigo").value.replace(/\D/g,"").slice(0,5);$("codigo").value=v;if(v.length===5){actualizarVisibilidadRecurso();registrarNormal()}else actualizarVisibilidadRecurso()}else if($("codigo").value.length>QR_INVENTARIO_MAX){$("codigo").value=$("codigo").value.slice(0,QR_INVENTARIO_MAX)}});$("modoInicioBtn").onclick=()=>seleccionarModo("NORMAL");$("modoParadaBtn").onclick=()=>seleccionarModo("PARADA");$("modoStockBtn").onclick=()=>seleccionarModo("EN STOCK");$("modoSalidaStockBtn").onclick=()=>seleccionarModo("SALIDA STOCK");$("adminBtn").onclick=abrirAdmin;$("cerrarAdminBtn").onclick=cerrarAdmin;$("probarSyncTodosBtn").onclick=probarSincronizacionTodosEquipos;$("configurarEquipoBtn").onclick=configurarEquipoActual;$("exportarBtn").onclick=exportarExcel;$("borrarAnterioresBtn").onclick=borrarAnterioresFinalizados;$("borrarSeleccionadosBtn").onclick=mostrarBorradoSeleccionados;$("confirmarSeleccionBtn").onclick=confirmarBorradoSeleccionados;$("filtroBorrarTexto").oninput=renderSeleccionBorrado;$("filtroBorrarEstacion").onchange=renderSeleccionBorrado;$("tablaSeleccion").addEventListener("change",manejarSeleccionBorrado);$("seleccionarTodos").onchange=manejarSeleccionarTodos;$("seguimientoBtn").onclick=abrirSeguimiento;$("cerrarSeguimientoBtn").onclick=cerrarSeguimiento;$("actualizarSeguimientoBtn").onclick=()=>cargarDrive(renderSeguimiento);setTimeout(()=>procesarPendientesSync(false),1000);setTimeout(limpiezaAutomaticaLocal,2500);setInterval(limpiezaAutomaticaLocal,3600000);setTimeout(()=>$("codigo").focus(),200)}
document.addEventListener("DOMContentLoaded",iniciar);

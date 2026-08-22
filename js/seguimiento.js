window.datosRemotos=null;

function normalizarFilaKanban(r){
  return {
    fecha:String(r.fecha||""),
    codigo:String(r.codigo||""),
    balanza:String(r.balanza||""),
    descarguio:String(r.descarguio||r.descarguío||""),
    chancado:String(r.chancado||""),
    muestreo:String(r.muestreo||""),
    secado:String(r.secado||""),
    pulverizado:String(r.pulverizado||""),
    cuarteo:String(r.cuarteo_sellado||r.cuarteo||""),
    atencion:String(r.atencion_al_cliente||r.atencion||""),
    lead:String(r.lead_time||r.lead||""),
    estado:String(r.estado||"").toUpperCase()
  };
}

function abrirSeguimiento(){
  $("seguimientoModal").classList.remove("hide");
  renderSeguimiento();
  if(navigator.onLine)cargarDrive(renderSeguimiento);
}

function cerrarSeguimiento(){
  $("seguimientoModal").classList.add("hide");
  enfocarCodigo();
}

function renderSeguimiento(){
  const remoto=Array.isArray(window.datosRemotos)?window.datosRemotos:[];
  const data=remoto.map(normalizarFilaKanban);
  const meta=window.metaReporte||{};
  $("fuenteSeguimiento").textContent=window.errorReporte
    ?("ERROR: "+window.errorReporte)
    :(remoto.length
      ?("Fuente: hoja KANBAN | "+remoto.length+" filas | Encabezado fila "+String(meta.fila_encabezado||"?"))
      :"La hoja KANBAN respondió, pero no se encontraron filas con CÓDIGO.");

  const filtro=$("filtroEstado").value;
  const filtrado=filtro==="TODOS"?data:data.filter(x=>x.estado===filtro);

  $("kpiSeguimiento").innerHTML=
    `<div class='kpiCard'><small>Total</small><b>${data.length}</b></div>`+
    `<div class='kpiCard'><small>En proceso</small><b>${data.filter(x=>x.estado==="EN PROCESO").length}</b></div>`+
    `<div class='kpiCard'><small>Finalizado</small><b>${data.filter(x=>x.estado==="FINALIZADO").length}</b></div>`+
    `<div class='kpiCard'><small>Otros</small><b>${data.filter(x=>x.estado!=="EN PROCESO"&&x.estado!=="FINALIZADO").length}</b></div>`;

  let html="<div class='tableWrap'><table class='tablaKanbanReporte'><thead><tr>"+
    "<th>FECHA</th><th>CÓDIGO</th><th>BALANZA</th><th>DESCARGUÍO</th><th>CHANCADO</th><th>MUESTREO</th><th>SECADO</th><th>PULVERIZADO</th>"+
    "<th>CUARTEO SELLADO</th><th>ATENCIÓN AL CLIENTE</th><th>LEAD TIME</th><th>ESTADO</th>"+
    "</tr></thead><tbody>";

  filtrado.forEach(x=>{
    html+=`<tr>
      <td>${esc(x.fecha)}</td>
      <td><b>${esc(x.codigo)}</b></td>
      <td>${esc(x.balanza).replace(/\n/g,"<br>")}</td>
      <td>${esc(x.descarguio).replace(/\n/g,"<br>")}</td>
      <td>${esc(x.chancado).replace(/\n/g,"<br>")}</td>
      <td>${esc(x.muestreo).replace(/\n/g,"<br>")}</td>
      <td>${esc(x.secado).replace(/\n/g,"<br>")}</td>
      <td>${esc(x.pulverizado).replace(/\n/g,"<br>")}</td>
      <td>${esc(x.cuarteo).replace(/\n/g,"<br>")}</td>
      <td>${esc(x.atencion).replace(/\n/g,"<br>")}</td>
      <td>${esc(x.lead).replace(/\n/g,"<br>")}</td>
      <td><b>${esc(x.estado)}</b></td>
    </tr>`;
  });
  html+="</tbody></table></div>";
  $("kanban").innerHTML=html;
}

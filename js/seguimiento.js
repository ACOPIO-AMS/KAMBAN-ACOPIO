window.datosRemotos=null;

function construirSeguimiento(){
  const src=(Array.isArray(window.datosRemotos)&&window.datosRemotos.length)?window.datosRemotos:datos();
  const grupos={};
  src.filter(r=>!r.eliminado).forEach(r=>{
    if(!r.codigo || !r.estacion) return;
    const key=r.estacion+"||"+r.codigo;
    if(!grupos[key]) grupos[key]=[];
    grupos[key].push(r);
  });
  const out=[];
  Object.values(grupos).forEach(regs=>{
    regs.sort((a,b)=>String(a.fecha_hora).localeCompare(String(b.fecha_hora)));
    const first=regs[0], last=[...regs].reverse().find(r=>r.evento) || regs[regs.length-1];
    const eventos={}; regs.forEach(r=>{ if(r.evento) eventos[String(r.evento).toUpperCase()]=true; });
    const ev=String(last.evento||"SIN EVENTO").toUpperCase();
    let estado="EN PROCESO";
    if(ev==="PARADA") estado="EN PARADA";
    else if(ev==="EN STOCK") estado="EN STOCK";
    else if(eventos.FINAL && ev!=="EN STOCK") estado="FINALIZADO";
    const fin=regs.find(r=>String(r.evento).toUpperCase()==="FINAL");
    const min=minutosEntre(first.fecha_hora, fin?fin.fecha_hora:null);
    if(estado==="EN PROCESO" && min>(UMBRALES_MINUTOS[first.estacion]||60)) estado="DEMORA";
    out.push({codigo:first.codigo,estacion:first.estacion,ultimoEvento:ev,estado,minutos:min,ultimo:last.fecha_hora});
  });
  return out.sort((a,b)=>String(b.ultimo).localeCompare(String(a.ultimo)));
}

function abrirSeguimiento(){
  $("seguimientoModal").classList.remove("hide");
  renderSeguimiento();
  if(navigator.onLine) cargarDrive(renderSeguimiento);
}
function cerrarSeguimiento(){ $("seguimientoModal").classList.add("hide"); enfocarCodigo(); }

function renderSeguimiento(){
  const data=construirSeguimiento();
  $("fuenteSeguimiento").textContent=(Array.isArray(window.datosRemotos)&&window.datosRemotos.length)?"Fuente: Google Sheets / Drive":"Fuente: base local";
  const base=data.filter(x=>x.estado!=="FINALIZADO" || esHoy(x.ultimo));
  const filtro=$("filtroEstado").value;
  const filtrado=filtro==="TODOS"?base:base.filter(x=>x.estado===filtro);
  $("kpiSeguimiento").innerHTML =
    `<div class='kpiCard'><small>Visible</small><b>${base.length}</b></div>`+
    `<div class='kpiCard'><small>Proceso</small><b>${base.filter(x=>x.estado==="EN PROCESO"||x.estado==="DEMORA").length}</b></div>`+
    `<div class='kpiCard'><small>Parada</small><b>${base.filter(x=>x.estado==="EN PARADA").length}</b></div>`+
    `<div class='kpiCard'><small>Stock</small><b>${base.filter(x=>x.estado==="EN STOCK").length}</b></div>`;

  const nombres={"BALANZA":"BALANZA","DESCARGUIO":"DESCARGUÍO","CHANCADO":"CHANCADO","MUESTREO":"MUESTREO","SECADO":"SECADO","PULVERIZADO":"PULVERIZADO","CUARTEOSELLADO":"CUARTEO<br>SELLADO","ATENCION AL CLIENTE":"ATENCIÓN<br>CLIENTE"};
  let html="<div class='kanbanBoard'>";
  STATIONS.forEach(st=>{
    html+=`<div class='kanbanCol'><div class='kanbanHead'>${nombres[st]||st}</div>`;
    filtrado.filter(x=>x.estacion===st).sort((a,b)=>{
      if(a.estado==="FINALIZADO"&&b.estado!=="FINALIZADO") return 1;
      if(a.estado!=="FINALIZADO"&&b.estado==="FINALIZADO") return -1;
      return String(b.ultimo).localeCompare(String(a.ultimo));
    }).forEach(x=>{
      let cls="loteProceso";
      if(x.estado==="EN PARADA") cls="loteParada"; else if(x.estado==="EN STOCK") cls="loteStock"; else if(x.estado==="DEMORA") cls="loteDemora"; else if(x.estado==="FINALIZADO") cls="loteOk";
      html+=`<div class='loteCard ${cls}'><div class='loteCode'>${x.codigo}</div><div class='loteTime'>${horaCorta(x.ultimo)}</div><div class='loteEvent'>${x.ultimoEvento}</div></div>`;
    });
    html+="</div>";
  });
  html+="</div>";
  $("kanban").innerHTML=html;
}

window.datosRemotos=null;
function abrirSeguimiento(){$("seguimientoModal").classList.remove("hide");renderSeguimiento();if(navigator.onLine)cargarDrive(renderSeguimiento)}
function cerrarSeguimiento(){$("seguimientoModal").classList.add("hide")}
function renderSeguimiento(){const d=Array.isArray(window.datosRemotos)?window.datosRemotos:[];$("fuenteSeguimiento").textContent=window.errorReporte?"ERROR: "+window.errorReporte:`Fuente KANBAN: ${d.length} filas`;$("kanban").innerHTML="<div class='tableWrap'><table><tr><th>FECHA</th><th>CÓDIGO</th><th>ESTADO</th><th>LEAD TIME</th></tr>"+d.map(x=>`<tr><td>${textoTabla(x.fecha||"")}</td><td>${textoTabla(x.codigo||"")}</td><td>${textoTabla(x.estado||"")}</td><td>${textoTabla(x.lead_time||x.lead||"")}</td></tr>`).join("")+"</table></div>"}

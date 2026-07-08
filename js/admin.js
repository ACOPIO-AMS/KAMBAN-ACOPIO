function abrirAdmin(){
  const pin=prompt("Clave administrador:");
  if(pin!==ADMIN_PIN){ if(pin!==null) alert("Clave incorrecta."); return; }
  $("adminModal").classList.remove("hide");
  actualizarAdmin();
}
function cerrarAdmin(){ $("adminModal").classList.add("hide"); enfocarCodigo(); }
function actualizarAdmin(){
  const d=datos();
  $("adminInfo").textContent=`Registros locales: ${d.length} | Pendientes sync: ${d.filter(r=>!r.sincronizado).length}`;
}
function exportarCSV(){
  const rows=[["CODIGO","EVENTO","FECHA_HORA","OPERADOR","ESTACION","ID"]];
  datos().forEach(r=>rows.push([r.codigo,r.evento,r.fecha_hora,r.operador,r.estacion,r.id]));
  const csv=rows.map(r=>r.map(c=>`"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download="respaldo_kamban_"+Date.now()+".csv";
  a.click();
}
function borradoManual(){
  if(!confirm("¿Ejecutar BORRADO MANUAL local?\n\nNo borra Google Sheets. Conserva registros del día y pendientes.")) return;
  const hoy=hoyISO();
  const pend={}; pendientesPorFinalizar().forEach(x=>pend[x.estacion+"||"+x.codigo]=true);
  const hoyKeys={}; datos().forEach(r=>{ if(fechaSolo(r.fecha_hora)>=hoy) hoyKeys[r.estacion+"||"+r.codigo]=true; });
  const before=datos();
  const after=before.filter(r=>{
    const key=r.estacion+"||"+r.codigo;
    return fechaSolo(r.fecha_hora)>=hoy || pend[key] || hoyKeys[key];
  });
  guardarDatos(after);
  render(); actualizarAdmin();
  alert("Borrado manual terminado. Eliminados: "+(before.length-after.length));
}

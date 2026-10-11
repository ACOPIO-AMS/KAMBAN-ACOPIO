function instanteEvento(v){const t=Date.parse(String(v||"").replace(" ","T"));return Number.isFinite(t)?t:null}
function duracionEvento(a,b){return a!==null&&b!==null&&b>=a?Math.floor((b-a)/1000):null}
function minutosDuracion(s){if(s===null||!Number.isFinite(s))return"—";return String(Math.round(s/60*100)/100)}
function calcularTiemposProceso(registros){
 const grupos=new Map();(registros||[]).filter(r=>r&&!r.eliminado&&r.codigo&&r.estacion&&r.estacion!=="INVENTARIO").forEach(r=>{const k=r.estacion+"||"+r.codigo;if(!grupos.has(k))grupos.set(k,[]);grupos.get(k).push(r)});const out=[];
 grupos.forEach(eventos=>{eventos.sort((a,b)=>String(a.fecha_hora).localeCompare(String(b.fecha_hora)));let recep=null,ini=null,fin=null,parada=null,pausa=0,finId="";eventos.forEach(r=>{const t=instanteEvento(r.fecha_hora);if(t===null)return;if(r.evento==="RECEPCION")recep=t;if(r.evento==="INICIO")ini=t;if(r.evento==="PARADA")parada=t;if(r.evento==="REINICIO"&&parada!==null){pausa+=duracionEvento(parada,t)||0;parada=null}if(r.evento==="FINAL"){fin=t;finId=r.id}});if(fin!==null)out.push({finId,espera:duracionEvento(recep,ini),parada:pausa,proceso:duracionEvento(ini,fin)!==null?Math.max(0,duracionEvento(ini,fin)-pausa):null,permanencia:duracionEvento(recep,fin)})});return out;
}

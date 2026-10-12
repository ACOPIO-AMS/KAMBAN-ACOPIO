function instanteEvento(v){const t=Date.parse(String(v||"").replace(" ","T"));return Number.isFinite(t)?t:null}
function duracionEvento(a,b){return a!==null&&b!==null&&b>=a?(b-a)/1000:null}
function minutosDuracion(s){if(s===null||!Number.isFinite(s))return"—";return String(Math.round(s/60*100)/100)}
function calcularTiemposProceso(registros){
 const grupos=new Map();
 (registros||[]).filter(r=>r&&!r.eliminado&&r.codigo&&r.estacion&&r.estacion!=="INVENTARIO").forEach(r=>{const k=r.estacion+"||"+r.codigo;if(!grupos.has(k))grupos.set(k,[]);grupos.get(k).push(r)});
 const out=[];
 grupos.forEach(eventos=>{
  eventos.sort((a,b)=>String(a.fecha_hora).localeCompare(String(b.fecha_hora)));
  let ciclo=null;
  const nuevo=()=>({recepcion:null,inicio:null,parada:null,pausas:0,tuvoParada:false,invalido:false});
  eventos.forEach(r=>{
   const t=instanteEvento(r.fecha_hora);if(t===null)return;
   if(r.evento==="RECEPCION"){ciclo=nuevo();ciclo.recepcion=t;return}
   if(r.evento==="INICIO"){if(!ciclo)ciclo=nuevo();ciclo.inicio=t;return}
   if(r.evento==="SALIDA STOCK"&&r.estacion==="MUESTREO"){if(!ciclo)ciclo=nuevo();if(ciclo.inicio===null)ciclo.inicio=t;return}
   if(r.evento==="PARADA"){if(ciclo&&ciclo.inicio!==null&&ciclo.parada===null){ciclo.parada=t;ciclo.tuvoParada=true}else if(ciclo)ciclo.invalido=true;return}
   if(r.evento==="REINICIO"){if(ciclo&&ciclo.parada!==null){const d=duracionEvento(ciclo.parada,t);if(d===null)ciclo.invalido=true;else ciclo.pausas+=d;ciclo.parada=null}else if(ciclo)ciclo.invalido=true;return}
   if(r.evento==="FINAL"){
    if(!ciclo)ciclo=nuevo();
    const espera=duracionEvento(ciclo.recepcion,ciclo.inicio);
    const bruto=duracionEvento(ciclo.inicio,t);
    const permanencia=duracionEvento(ciclo.recepcion!==null?ciclo.recepcion:ciclo.inicio,t);
    const valido=bruto!==null&&!ciclo.invalido&&ciclo.parada===null&&ciclo.pausas<=bruto;
    out.push({finId:r.id,espera,parada:valido&&ciclo.tuvoParada?ciclo.pausas:null,tuvoParada:valido&&ciclo.tuvoParada,proceso:valido?bruto-ciclo.pausas:null,permanencia});
    ciclo=null;
   }
  });
 });
 return out;
}

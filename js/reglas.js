function reglasEstacion(e){return EVENTS_BY_STATION[e]||EVENTS_BY_STATION.DEFAULT}
function permiteParada(e){return e==="CHANCADO"||e==="DESCARGUIO"}
function permiteStock(e){return e==="DESCARGUIO"||e==="MUESTREO"}
function recursoAsignadoProceso(codigo,estacion){
 const regs=registrosPor(codigo,estacion);for(let i=regs.length-1;i>=0;i--){if(["INICIO","RECEPCION"].includes(regs[i].evento)&&regs[i].recurso)return regs[i].recurso}return "";
}
function eventoAutomatico(codigo,estacion){
 const ultimo=ultimoEvento(codigo,estacion);
 if(permiteParada(estacion)&&ultimo==="PARADA")return "REINICIO";
 const reglas=reglasEstacion(estacion);const usados=registrosPor(codigo,estacion).filter(r=>reglas.includes(r.evento)).length;return reglas[usados]||"";
}
function validarSecuencia(codigo,estacion,evento,recurso){
 if(!evento)return {ok:false,msg:"El lote ya completó los eventos de esta estación."};
 const ultimo=ultimoEvento(codigo,estacion),asignado=recursoAsignadoProceso(codigo,estacion);
 if(asignado&&!["EN STOCK","SALIDA STOCK"].includes(evento)&&String(recurso||"")!==asignado)return{ok:false,msg:`El lote ${codigo} inició en ${asignado}. Debe continuar con el mismo recurso.`};
 if(evento==="FINAL"&&estacion!=="ATENCION AL CLIENTE"&&!tieneEvento(codigo,estacion,"INICIO")&&!(estacion==="MUESTREO"&&tieneEvento(codigo,estacion,"SALIDA STOCK")))return{ok:false,msg:"FINAL requiere INICIO previo."};
 if(evento==="PARADA"&&!tieneEvento(codigo,estacion,"INICIO"))return{ok:false,msg:"PARADA requiere INICIO previo."};
 if(evento==="REINICIO"&&ultimo!=="PARADA")return{ok:false,msg:"REINICIO requiere PARADA previa."};
 return{ok:true};
}
function pendientesPorFinalizar(){
 const grupos={};
 datos().filter(r=>!r.eliminado&&r.estacion!=="INVENTARIO").forEach(r=>{
  const k=r.estacion+"||"+r.codigo;
  if(!grupos[k])grupos[k]={codigo:r.codigo,estacion:r.estacion,recurso:"",eventos:{},ultimo:"",movimientosStock:[]};
  const g=grupos[k];
  g.eventos[r.evento]=true;
  if(r.evento==="EN STOCK"||r.evento==="SALIDA STOCK")g.movimientosStock.push(r);
  if(!g.ultimo||r.fecha_hora>g.ultimo){g.ultimo=r.fecha_hora;g.recurso=r.recurso||g.recurso}
 });
 return Object.values(grupos).map(g=>{
  // Un lote en stock permanece pendiente aunque tenga FINAL.
  // Solo desaparece del panel cuando su último movimiento es SALIDA STOCK.
  const ultimoStock=g.movimientosStock.sort((a,b)=>String(a.fecha_hora).localeCompare(String(b.fecha_hora))).at(-1);
  const enStock=!!ultimoStock&&ultimoStock.evento==="EN STOCK";
  if(enStock)return {...g,falta:"SALIDA STOCK"};
  if(g.eventos.FINAL||ultimoStock&&ultimoStock.evento==="SALIDA STOCK")return null;
  return {...g,falta:reglasEstacion(g.estacion).filter(e=>!g.eventos[e]).join(" / ")};
 }).filter(Boolean).sort((a,b)=>String(b.ultimo).localeCompare(String(a.ultimo)));
}

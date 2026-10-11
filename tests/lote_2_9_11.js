async function enviarIndividuales(payloads){
  const resultado=[];
  for(const p of payloads){
    try{
      // El servidor debe devolver el mismo ID y recurso antes de marcar el dato.
      await enviarYConfirmar(p);
      resultado.push({ok:true,id:p.id,recurso:p.recurso,result:"CONFIRMADO"});
    }catch(e){
      const msg=String(e&&e.message||e);
      resultado.push({ok:false,id:p.id,error:msg});
      // No saturar Apps Script cuando hay bloqueo o falta de conexión.
      if(/base ocupada|ocupado|tiempo límite|conectar|timeout/i.test(msg))break;
    }
  }
  return resultado;
}
async function enviarLote(payloads){
  if(syncBackendSoloIndividual)return enviarIndividuales(payloads);
  const lote=codificarLote(payloads);
  // Mantiene las peticiones por debajo del tamaño máximo aceptado por JSONP.
  if(lote.length>1400&&payloads.length>1){
    const mitad=Math.ceil(payloads.length/2);
    const primero=await enviarLote(payloads.slice(0,mitad));
    const segundo=await enviarLote(payloads.slice(mitad));
    return primero.concat(segundo);
  }
  let r;
  try{r=await jsonpSeguro({action:"save_batch",lote},SYNC_REQUEST_TIMEOUT_MS)}
  catch(e){throw e} // Ante timeout, el servidor pudo haber guardado el ID: reintentar sin duplicar.
  if(!r||r.ok!==true){
    const msg=String(r&&r.error||"Apps Script rechazó el lote.");
    if(/acción no reconocida|accion no reconocida|unknown action|save_batch.*no/i.test(msg)){
      syncBackendSoloIndividual=true;
      return enviarIndividuales(payloads);
    }
    throw new Error(msg);
  }
  // Nunca se admite un OK general como confirmación de todos los registros.
  if(!Array.isArray(r.data)){
    syncBackendSoloIndividual=true;
    return enviarIndividuales(payloads);
  }
  const porId=new Map(r.data.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
  const faltantes=payloads.filter(p=>!porId.has(String(p.id)));
  if(faltantes.length){
    const individuales=await enviarIndividuales(faltantes);
    individuales.forEach(x=>porId.set(String(x.id),x));
  }
  return payloads.map(p=>porId.get(String(p.id))||{ok:false,id:p.id,error:"ID sin confirmación; se reintentará."});
}

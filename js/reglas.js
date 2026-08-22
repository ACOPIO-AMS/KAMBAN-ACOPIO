let modoEspecial="NORMAL";

function permiteParada(est){return est==="CHANCADO"}
function permiteStock(est){return est==="DESCARGUIO"||est==="MUESTREO"}
function reglasEstacion(est){return EVENTS_BY_STATION[est]||EVENTS_BY_STATION.DEFAULT}
function estacionUsaRecurso(est){return ["DESCARGUIO","CHANCADO","SECADO","PULVERIZADO"].includes(est)}

function recursoAsignadoProceso(codigo,estacion){
  const regs=registrosPor(codigo,estacion)
    .filter(r=>!r.eliminado&&String(recursoDetalle(r)||"").trim());
  if(!regs.length)return "";

  // El recurso válido es el asignado al INICIO/RECEPCIÓN más reciente.
  // Esto mantiene PARADA, REINICIO, FINAL, STOCK y SALIDA en el mismo equipo,
  // pero permite reutilizar el código en un nuevo ciclo futuro.
  for(let i=regs.length-1;i>=0;i--){
    const ev=String(regs[i].evento||"").toUpperCase();
    if(ev==="INICIO"||ev==="RECEPCION"){
      return normalizarRecurso(recursoDetalle(regs[i]));
    }
  }
  return normalizarRecurso(recursoDetalle(regs[regs.length-1]));
}

function ubicacionMuestreoBase(recurso){
  return normalizarRecurso(String(recurso||"")
    .replace(/\s+SALIDA\s+STOCK\s*$/i,"")
    .replace(/\s+STOCK\s+(EP|MC)\s*$/i,""));
}

function ubicacionMuestreoAsignada(codigo){
  const regs=registrosPor(codigo,"MUESTREO");
  const recepcion=regs.find(r=>String(r.evento||"").toUpperCase()==="RECEPCION");
  return recepcion?ubicacionMuestreoBase(recursoDetalle(recepcion)):"";
}

function eventoAutomatico(codigo,estacion){
  const ultimo=ultimoEvento(codigo,estacion);
  if(estacion==="CHANCADO"&&ultimo==="PARADA")return"REINICIO";
  // En MUESTREO, la salida de stock se registra desde el modo INICIO.
  // Luego la siguiente lectura normal cierra directamente el proceso con FINAL.
  if(estacion==="MUESTREO"&&ultimoEventoStock(codigo,estacion)==="EN STOCK")return"SALIDA STOCK";
  if(estacion==="MUESTREO"&&ultimo==="SALIDA STOCK")return"FINAL";
  const reglas=reglasEstacion(estacion);
  const usados=registrosPor(codigo,estacion)
    .filter(r=>reglas.includes(String(r.evento||"").toUpperCase())).length;
  return reglas[usados]||"";
}

function validarSecuencia(codigo,estacion,evento,recurso){
  const ev=String(evento||"").toUpperCase();
  const ultimo=ultimoEvento(codigo,estacion);
  const recursoActual=normalizarRecurso(recurso);

  // STOCK no depende del recurso donde se ejecutó el proceso anterior.
  // En DESCARGUÍO puede registrarse sin seleccionar tolva.
  if(estacionUsaRecurso(estacion)&&ev!=="EN STOCK"&&ev!=="SALIDA STOCK"){
    const asignado=recursoAsignadoProceso(codigo,estacion);
    if(asignado&&recursoActual!==asignado){
      return{
        ok:false,
        msg:`RECURSO INCORRECTO.\n\nEl lote ${codigo} inició en ${asignado}.\nDebe continuar y finalizar usando ${asignado}.`
      };
    }
  }

  if(estacion==="CHANCADO"){
    if(ev==="PARADA"&&!tieneEvento(codigo,estacion,"INICIO"))
      return{ok:false,msg:"NO SE PUEDE REGISTRAR PARADA.\n\nEl lote aún no tiene INICIO en CHANCADO."};
    if(ev==="PARADA"&&ultimo==="PARADA")
      return{ok:false,msg:"Ya está en PARADA. La siguiente lectura normal registrará REINICIO."};
    if(ev==="FINAL"&&ultimo==="PARADA")
      return{ok:false,msg:"Primero escanee para registrar REINICIO."};
  }

  if(estacion==="DESCARGUIO"){
    const st=ultimoEventoStock(codigo,estacion);
    const yaFinal=tieneEvento(codigo,estacion,"FINAL");
    if(ev==="EN STOCK"){
      if(st==="EN STOCK")return{ok:false,msg:"El lote ya está EN STOCK. Primero SALIDA STOCK."};
      if(!yaFinal)return{ok:false,msg:"EN STOCK solo después de FINAL en DESCARGUÍO."};
    }
    if(ev==="SALIDA STOCK"&&st!=="EN STOCK")return{ok:false,msg:"El lote no está EN STOCK."};
    if(st==="EN STOCK"&&ev!=="SALIDA STOCK")return{ok:false,msg:"LOTE EN STOCK. Primero SALIDA STOCK."};
  }

  if(estacion==="MUESTREO"){
    const st=ultimoEventoStock(codigo,estacion);
    const yaRecepcion=tieneEvento(codigo,estacion,"RECEPCION");
    const yaInicio=tieneEvento(codigo,estacion,"INICIO");
    const ubicacionFijada=ubicacionMuestreoAsignada(codigo);
    if(ubicacionFijada&&ubicacionMuestreoBase(recursoActual)!==ubicacionFijada)
      return{ok:false,msg:`UBICACIÓN INCORRECTA.\n\nEl lote fue recibido en ${ubicacionFijada}. Debe mantenerse en esa misma ubicación.`};
    if(ev==="EN STOCK"){
      if(!yaRecepcion)return{ok:false,msg:"EN STOCK en MUESTREO solo se registra después de RECEPCIÓN."};
      if(yaInicio)return{ok:false,msg:"EN STOCK en MUESTREO solo se registra antes del INICIO de proceso."};
      if(st==="EN STOCK")return{ok:false,msg:"El lote ya está EN STOCK. Primero registre SALIDA STOCK."};
    }
    if(ev==="SALIDA STOCK"&&st!=="EN STOCK")return{ok:false,msg:"El lote no está EN STOCK en MUESTREO."};
    if(st==="EN STOCK"&&ev!=="SALIDA STOCK")return{ok:false,msg:"LOTE EN STOCK. Primero registre SALIDA STOCK."};
  }

  const inicioValido=tieneEvento(codigo,estacion,"INICIO")||
    (estacion==="MUESTREO"&&tieneEvento(codigo,estacion,"SALIDA STOCK"));
  if(ev==="FINAL"&&estacion!=="ATENCION AL CLIENTE"&&!inicioValido)
    return{ok:false,msg:"No se puede registrar FINAL sin INICIO previo."};

  return{ok:true};
}

function estadoRegistro(r){
  const ev=String(r.evento||"").toUpperCase();
  if(ev==="PARADA")return["PARADA","bStop"];
  if(ev==="REINICIO")return["REINICIO","bInfo"];
  if(ev==="EN STOCK")return["EN STOCK","bStock"];
  if(ev==="SALIDA STOCK")return["SALIDA STOCK","bInfo"];
  if(ev==="FINAL")return["FINALIZADO","bOk"];
  if(ev==="INICIO")return["EN PROCESO","bProc"];
  if(ev==="RECEPCION")return["RECIBIDO","bRec"];
  return["SIN EVENTO","bInfo"];
}

function pendientesPorFinalizar(){
  const grupos={};
  datos().filter(r=>!r.eliminado).forEach(r=>{
    if(!r.codigo||!r.estacion)return;
    const key=r.estacion+"||"+r.codigo;
    if(!grupos[key])grupos[key]={codigo:r.codigo,estacion:r.estacion,eventos:{},ultimo:"",ultimoEvento:""};
    const ev=String(r.evento||"").toUpperCase();
    if(ev&&ev!=="SIN EVENTO"){
      grupos[key].eventos[ev]=true;
      if(!grupos[key].ultimo||r.fecha_hora>grupos[key].ultimo){
        grupos[key].ultimo=r.fecha_hora;
        grupos[key].ultimoEvento=ev;
      }
    }else if(!grupos[key].ultimo||r.fecha_hora>grupos[key].ultimo){
      grupos[key].ultimo=r.fecha_hora;
    }
  });

  const out=[];
  Object.values(grupos).forEach(g=>{
    if(g.ultimoEvento==="PARADA")return out.push({...g,falta:"PARADA",clase:"bStop"});
    if(g.ultimoEvento==="EN STOCK")return out.push({...g,falta:"EN STOCK",clase:"bStock"});
    if(g.eventos.FINAL)return;
    const faltan=reglasEstacion(g.estacion).filter(ev=>!g.eventos[ev]);
    if(faltan.length)out.push({...g,falta:faltan.join(" / "),clase:faltan.includes("FINAL")?"bProc":"bRec"});
  });

  return out.sort((a,b)=>{
    const p={PARADA:1,"EN STOCK":2};
    return(p[a.falta]||9)-(p[b.falta]||9)||String(a.ultimo).localeCompare(String(b.ultimo));
  });
}

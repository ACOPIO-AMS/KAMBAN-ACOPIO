function normalizarRegistroLocal(r){
  if(!r||typeof r!=="object")return null;

  const estacion=String(r.estacion||"").trim().toUpperCase();
  let recurso=String(r.recurso||"").trim().toUpperCase();

  if(!recurso&&estacion==="DESCARGUIO"&&r.tolva)recurso="T"+String(r.tolva).replace(/^T/i,"");
  if(!recurso&&estacion==="CHANCADO"&&r.circuito)recurso="C"+String(r.circuito).replace(/^C/i,"");
  if(!recurso&&estacion==="SECADO"&&r.horno)recurso="H"+String(r.horno).replace(/^H/i,"");
  if(!recurso&&estacion==="PULVERIZADO"&&r.molino)recurso="M"+String(r.molino).replace(/^M/i,"");

  return {
    ...r,
    id:String(r.id||r.id_registro||"").trim(),
    codigo:String(r.codigo||"").trim(),
    evento:String(r.evento||"").trim().toUpperCase(),
    fecha_hora:String(r.fecha_hora||r.fechaHora||"").trim(),
    operador:String(r.operador||"").trim(),
    estacion,
    recurso,
    sincronizado:r.sincronizado===true,
    sync_intentos:Number(r.sync_intentos||0),
    sync_ultimo_error:String(r.sync_ultimo_error||""),
    sync_ultima_fecha:String(r.sync_ultima_fecha||""),
    eliminado:r.eliminado===true,
    version:String(r.version||APP_VERSION)
  };
}

function datos(){
  try{
    const principal=localStorage.getItem(DB_KEY);
    const respaldo=localStorage.getItem(DB_BACKUP_KEY);
    const raw=JSON.parse(principal||respaldo||"[]");
    if(!Array.isArray(raw))return [];
    const normalizados=raw.map(normalizarRegistroLocal).filter(Boolean);
    if(JSON.stringify(raw)!==JSON.stringify(normalizados)){
      const texto=JSON.stringify(normalizados);
      localStorage.setItem(DB_KEY,texto);
      localStorage.setItem(DB_BACKUP_KEY,texto);
    }
    return normalizados;
  }catch(e){
    console.error("Base local dañada:",e);
    return [];
  }
}

function guardarDatos(data){
  const texto=JSON.stringify((data||[]).map(normalizarRegistroLocal).filter(Boolean));
  // Escritura espejo: si una clave se daña, la otra permite recuperar la cola.
  localStorage.setItem(DB_KEY,texto);
  localStorage.setItem(DB_BACKUP_KEY,texto);
}

function agregarRegistro(reg){
  const data=datos();
  data.unshift(normalizarRegistroLocal(reg));
  guardarDatos(data);
}

function actualizarRegistro(id,patch){
  const data=datos();
  const i=data.findIndex(r=>r.id===id);
  if(i>=0){
    data[i]=normalizarRegistroLocal({...data[i],...patch});
    guardarDatos(data);
  }
}

function ultimoRegistro(){return datos().find(r=>!r.eliminado)||null}

function registrosPor(codigo,estacion){
  return datos()
    .filter(r=>!r.eliminado&&String(r.codigo).trim()===String(codigo).trim()&&r.estacion===estacion)
    .sort((a,b)=>String(a.fecha_hora).localeCompare(String(b.fecha_hora)));
}

function ultimoEvento(codigo,estacion){
  const regs=registrosPor(codigo,estacion).filter(r=>r.evento&&r.evento!=="SIN EVENTO");
  return regs.length?String(regs[regs.length-1].evento).toUpperCase():"";
}

function tieneEvento(codigo,estacion,evento){
  return registrosPor(codigo,estacion).some(
    r=>String(r.evento||"").toUpperCase()===String(evento).toUpperCase()
  );
}

function ultimoEventoStock(codigo,estacion){
  const regs=registrosPor(codigo,estacion).filter(r=>{
    const ev=String(r.evento||"").toUpperCase();
    return ev==="EN STOCK"||ev==="SALIDA STOCK";
  });
  return regs.length?String(regs[regs.length-1].evento).toUpperCase():"";
}

function obtenerRegistro(id){return datos().find(r=>String(r.id)===String(id))||null}

function pendientesSyncOrdenados(){return datos().filter(r=>!r.eliminado&&!r.sincronizado).sort((a,b)=>String(a.fecha_hora).localeCompare(String(b.fecha_hora)))}

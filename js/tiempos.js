/* Tiempos calculados a partir de los eventos locales, sin alterar la base. */
function instanteEvento(valor){
  const t=Date.parse(String(valor||"").replace(" ","T"));
  return Number.isFinite(t)?t:null;
}

function duracionEvento(inicio,fin){
  return inicio!==null&&fin!==null&&fin>=inicio?Math.floor((fin-inicio)/1000):null;
}

function relojDuracion(segundos){
  if(segundos===null||!Number.isFinite(segundos))return "—";
  const h=Math.floor(segundos/3600),m=Math.floor(segundos%3600/60),s=segundos%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function calcularTiemposProceso(registros){
  const grupos=new Map();
  (registros||[]).filter(r=>r&&!r.eliminado&&r.codigo&&r.estacion)
    .forEach(r=>{
      const llave=r.estacion+"||"+r.codigo;
      if(!grupos.has(llave))grupos.set(llave,[]);
      grupos.get(llave).push(r);
    });

  const resultados=[];
  grupos.forEach((eventos,llave)=>{
    eventos.sort((a,b)=>String(a.fecha_hora||"").localeCompare(String(b.fecha_hora||"")));
    let ciclo=null;
    const nuevo=()=>({codigo:eventos[0].codigo,estacion:eventos[0].estacion,
      recepcion:null,inicio:null,fin:null,paradaInicio:null,paradaSeg:0,
      incompleto:false,ultimaFecha:""});
    const cerrar=()=>{
      if(!ciclo)return;
      const espera=duracionEvento(ciclo.recepcion,ciclo.inicio);
      const bruto=duracionEvento(ciclo.inicio,ciclo.fin);
      const proceso=bruto!==null&&!ciclo.incompleto&&ciclo.paradaInicio===null&&ciclo.paradaSeg<=bruto
        ?bruto-ciclo.paradaSeg:null;
      const permanencia=duracionEvento(ciclo.recepcion,ciclo.fin);
      if(ciclo.recepcion!==null||ciclo.inicio!==null){
        resultados.push({codigo:ciclo.codigo,estacion:ciclo.estacion,ultimaFecha:ciclo.ultimaFecha,
          espera,parada:ciclo.fin!==null&&!ciclo.incompleto&&ciclo.paradaInicio===null?ciclo.paradaSeg:null,
          proceso,permanencia,completo:ciclo.fin!==null});
      }
    };

    eventos.forEach(r=>{
      const ev=String(r.evento||"").toUpperCase(),t=instanteEvento(r.fecha_hora);
      if(t===null)return;
      if(ev==="RECEPCION"){
        cerrar();ciclo=nuevo();ciclo.recepcion=t;
      }else if(ev==="INICIO"){
        if(!ciclo||ciclo.fin!==null){cerrar();ciclo=nuevo();}
        if(ciclo.inicio===null)ciclo.inicio=t;
      }else if(ev==="SALIDA STOCK"&&r.estacion==="MUESTREO"){
        if(!ciclo)ciclo=nuevo();
        if(ciclo.inicio===null)ciclo.inicio=t;
      }else if(ev==="PARADA"){
        if(ciclo&&ciclo.inicio!==null&&ciclo.fin===null){
          if(ciclo.paradaInicio===null)ciclo.paradaInicio=t;
          else ciclo.incompleto=true;
        }
      }else if(ev==="REINICIO"){
        if(ciclo&&ciclo.paradaInicio!==null){
          const pausa=duracionEvento(ciclo.paradaInicio,t);
          if(pausa===null)ciclo.incompleto=true;
          else ciclo.paradaSeg+=pausa;
          ciclo.paradaInicio=null;
        }else if(ciclo)ciclo.incompleto=true;
      }else if(ev==="FINAL"){
        if(!ciclo)ciclo=nuevo();
        if(ciclo.fin===null)ciclo.fin=t;
      }
      if(ciclo)ciclo.ultimaFecha=r.fecha_hora;
    });
    cerrar();
  });
  return resultados.sort((a,b)=>String(b.ultimaFecha).localeCompare(String(a.ultimaFecha)));
}

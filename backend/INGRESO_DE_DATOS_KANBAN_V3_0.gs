function kaMarcaTiempo(v){
  var texto=kaTexto(v),m=texto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if(m)return Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);
  m=texto.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/);
  return m?Date.UTC(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+m[6]):null;
}

function kaSegundosEntre(a,b){
  return a!==null&&b!==null&&b>=a?Math.floor((b-a)/1000):null;
}

// Devuelve NUMERO en minutos. Ej.: 600 s = 10; 1 s = 0.02
function kaDuracionTexto(seg){
  if(seg===null||!isFinite(seg))return "";
  return Math.round((seg/60)*100)/100;
}

function kaCalcularFilasTiempos(filas,estacion){
  var eventos=filas.slice().sort(function(a,b){
    return (kaMarcaTiempo(a.valores[2])||0)-
           (kaMarcaTiempo(b.valores[2])||0)||
           a.fila-b.fila;
  });

  var ciclo=null,salidas=[];

  function nuevo(){
    return{
      recepcion:null,
      inicio:null,
      parada:null,
      pausas:0,
      tuvoParada:false,
      invalido:false,
      cerrado:false
    };
  }

  eventos.forEach(function(x){
    var ev=kaTexto(x.valores[1]).toUpperCase();
    var t=kaMarcaTiempo(x.valores[2]);
    if(t===null)return;

    if(ev==="RECEPCION"){
      ciclo=nuevo();
      ciclo.recepcion=t;

    }else if(ev==="INICIO"){
      if(!ciclo||ciclo.cerrado)ciclo=nuevo();
      if(ciclo.inicio===null)ciclo.inicio=t;

    }else if(ev==="SALIDA STOCK" && estacion==="MUESTREO"){
      if(!ciclo||ciclo.cerrado)ciclo=nuevo();
      if(ciclo.inicio===null)ciclo.inicio=t;

    }else if(ev==="PARADA" && ciclo && !ciclo.cerrado && ciclo.inicio!==null){
      if(ciclo.parada===null){
        ciclo.parada=t;
        ciclo.tuvoParada=true;
      }else{
        ciclo.invalido=true;
      }

    }else if(ev==="REINICIO" && ciclo && !ciclo.cerrado){
      if(ciclo.parada===null){
        ciclo.invalido=true;
      }else{
        var pausa=kaSegundosEntre(ciclo.parada,t);
        if(pausa===null){
          ciclo.invalido=true;
        }else{
          ciclo.pausas+=pausa;
        }
        ciclo.parada=null;
      }

    }else if(ev==="FINAL"){
      if(!ciclo||ciclo.cerrado)ciclo=nuevo();

      var espera=null;
      var bruto=null;
      var permanencia=null;

      // ESPERA = INICIO - RECEPCION, solo si existen ambos eventos
      if(ciclo.recepcion!==null && ciclo.inicio!==null){
        espera=kaSegundosEntre(ciclo.recepcion,ciclo.inicio);
      }

      // PROCESO base = FINAL - INICIO, solo si existe INICIO
      if(ciclo.inicio!==null){
        bruto=kaSegundosEntre(ciclo.inicio,t);
      }

      // PERMANENCIA = FINAL - RECEPCION; si no existe RECEPCION, FINAL - INICIO
      if(ciclo.recepcion!==null){
        permanencia=kaSegundosEntre(ciclo.recepcion,t);
      }else if(ciclo.inicio!==null){
        permanencia=kaSegundosEntre(ciclo.inicio,t);
      }

      var valido=
        bruto!==null &&
        !ciclo.invalido &&
        ciclo.parada===null &&
        ciclo.pausas<=bruto;

      var valorEspera = espera!==null ? kaDuracionTexto(espera) : "";

      // Si no hubo ninguna parada, dejar VACIO, no 0
      var valorParadas = valido && ciclo.tuvoParada
        ? kaDuracionTexto(ciclo.pausas)
        : "";

      // PROCESO EFECTIVO = (FINAL - INICIO) - SUMA(REINICIO - PARADA)
      var valorProceso = valido
        ? kaDuracionTexto(bruto-ciclo.pausas)
        : "";

      var valorPermanencia = permanencia!==null
        ? kaDuracionTexto(permanencia)
        : "";

      salidas.push({
        fila:x.fila,
        actuales:x.valores.slice(8,12),
        valores:[
          valorEspera,
          valorParadas,
          valorProceso,
          valorPermanencia
        ]
      });

      ciclo.cerrado=true;
    }
  });

  return salidas;
}

function kaActualizarTiemposCodigo(hoja,codigo){
  kaActualizarTiemposCodigos(hoja,[codigo]);
}

function kaActualizarTiemposCodigos(hoja,codigos){
  if(!codigos||!codigos.length)return;

  var ultimo=hoja.getLastRow();
  if(ultimo<2)return;

  var inicio=kaColumnaTiempos(hoja),
      desde=Math.max(2,ultimo-1999),
      cantidad=ultimo-desde+1,
      filas=hoja.getRange(desde,1,cantidad,8).getDisplayValues(),
      tiempos=hoja.getRange(desde,inicio,cantidad,4).getDisplayValues(),
      porCodigo=Object.create(null);

  codigos.forEach(function(codigo){
    porCodigo[codigo]=[];
  });

  filas.forEach(function(v,i){
    var codigo=kaTexto(v[0]);
    if(Object.prototype.hasOwnProperty.call(porCodigo,codigo)){
      porCodigo[codigo].push({
        fila:desde+i,
        valores:v.concat(tiempos[i])
      });
    }
  });

  codigos.forEach(function(codigo){
    kaCalcularFilasTiempos(porCodigo[codigo],hoja.getName()).forEach(function(x){
      if(x.valores.some(function(v,i){
        if(typeof v==="number")return Number(String(x.actuales[i]).replace(",","."))!==v;
        return v!==x.actuales[i];
      })){
        hoja.getRange(x.fila,inicio,1,4).setValues([x.valores]);
      }
    });
  });
}

// IMPORTANTE: los tiempos calculados NUNCA deben bloquear la sincronizacion.
function kaActualizarTiemposSeguro(hoja,codigos){
  try{
    if(!hoja || !codigos || !codigos.length)return true;
    kaActualizarTiemposCodigos(hoja,codigos);
    return true;
  }catch(error){
    Logger.log("ADVERTENCIA TIEMPOS - "+hoja.getName()+": "+kaError(error));
    return false;
  }
}

// Prueba de referencia:
// RECEPCION 10:00, INICIO 10:10, PARADA 10:20, REINICIO 10:25,
// PARADA 10:40, REINICIO 10:43, FINAL 11:00
// Resultado esperado: ESPERA 10, PARADAS 8, PROCESO 42, PERMANENCIA 60
function PRUEBA_TIEMPOS_V3_0_CORREGIDO(){
  var filas=[
    {fila:2,valores:["99999","RECEPCION","2026-10-11 10:00:00","","CHANCADO","","1","","","","",""]},
    {fila:3,valores:["99999","INICIO","2026-10-11 10:10:00","","CHANCADO","","2","","","","",""]},
    {fila:4,valores:["99999","PARADA","2026-10-11 10:20:00","","CHANCADO","","3","","","","",""]},
    {fila:5,valores:["99999","REINICIO","2026-10-11 10:25:00","","CHANCADO","","4","","","","",""]},
    {fila:6,valores:["99999","PARADA","2026-10-11 10:40:00","","CHANCADO","","5","","","","",""]},
    {fila:7,valores:["99999","REINICIO","2026-10-11 10:43:00","","CHANCADO","","6","","","","",""]},
    {fila:8,valores:["99999","FINAL","2026-10-11 11:00:00","","CHANCADO","","7","","","","",""]}
  ];
  return kaCalcularFilasTiempos(filas,"CHANCADO");
}

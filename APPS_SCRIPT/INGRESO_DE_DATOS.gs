/**
 * KANBAN BACKEND 0002.8.9
 * A CODIGO | B EVENTO | C FECHA Y HORA | D OPERARIO
 * E ESTACION | F RECURSO | G ID REGISTRO
 * BALANZA: RECURSO = tipo de mineral.
 * MUESTREO: RECURSO = ubicación (ej. 1 A, 8 C, PLANTA).
 */
var KA_SPREADSHEET_ID="1Hx4fLIcN2mC-JKlzOUd3Ntm7Wm_pH4njX5uPvBxglz0";
var KA_VERSION="0002.8.9";
var KA_HOJAS=["BALANZA","DESCARGUIO","CHANCADO","MUESTREO","SECADO","PULVERIZADO","CUARTEOSELLADO","ATENCION AL CLIENTE"];
var KA_COLUMNAS=["CODIGO","EVENTO","FECHA Y HORA","OPERARIO","ESTACION","RECURSO","ID REGISTRO","DETALLE"];

function doGet(e){var cb="";try{var p=e&&e.parameter?e.parameter:{};cb=kaTexto(p.callback);var a=kaTexto(p.action||"ping").toLowerCase();if(a==="ping")return kaSalida({ok:true,sistema:"KANBAN",version:KA_VERSION},cb);if(a==="delete"){var x=kaEliminar(p);return kaSalida({ok:true,version:KA_VERSION,result:x.result,id:x.id},cb);}if(a==="save"){var s=kaGuardar(kaParametrosARegistro(p));return kaSalida({ok:true,version:KA_VERSION,result:s.result,id:s.data.id,recurso:s.data.recurso,data:s.data},cb);}if(a==="kanban"){var k=kaListarKanban();return kaSalida({ok:true,version:KA_VERSION,data:k.data,meta:k.meta},cb);}
if(a==="list")return kaSalida({ok:true,version:KA_VERSION,data:kaListar()},cb);return kaSalida({ok:false,version:KA_VERSION,error:"Acción no reconocida: "+a},cb);}catch(error){return kaSalida({ok:false,version:KA_VERSION,error:kaError(error)},cb);}}
function doPost(e){try{if(!e||!e.postData||!e.postData.contents)throw new Error("POST sin contenido.");var s=kaGuardar(JSON.parse(e.postData.contents));return kaSalida({ok:true,version:KA_VERSION,result:s.result,id:s.data.id,recurso:s.data.recurso,data:s.data},"");}catch(error){return kaSalida({ok:false,version:KA_VERSION,error:kaError(error)},"");}}
function kaParametrosARegistro(p){return {codigo:p.codigo,evento:p.evento,fecha_hora:p.fecha_hora,operador:p.operador,estacion:p.estacion,recurso:p.recurso,detalle:p.detalle,tipo_mineral:p.tipo_mineral,ubicacion:p.ubicacion,id:p.id,eliminado:kaTexto(p.eliminado).toLowerCase()==="true",tolva:p.tolva,circuito:p.circuito,horno:p.horno,molino:p.molino};}
function kaLibro(){return SpreadsheetApp.openById(KA_SPREADSHEET_ID)}
function kaHoja(estacion){var libro=kaLibro(),hoja=libro.getSheetByName(estacion);if(!hoja)hoja=libro.insertSheet(estacion);var cache=CacheService.getScriptCache(),key="sheet_ready_"+estacion+"_0002_8_5";if(cache.get(key)!=="1"){if(hoja.getMaxColumns()<8)hoja.insertColumnsAfter(hoja.getMaxColumns(),8-hoja.getMaxColumns());hoja.getRange(1,1,1,8).setValues([KA_COLUMNAS]);hoja.setFrozenRows(1);cache.put(key,"1",21600);}return hoja;}
function kaEliminar(r){var estacion=kaEstacion(r.estacion),id=kaTexto(r.id);if(KA_HOJAS.indexOf(estacion)===-1)throw new Error("Estación inválida.");if(!id)throw new Error("ID vacío.");var lock=LockService.getScriptLock();if(!lock.tryLock(1500))throw new Error("Base ocupada.");try{var hoja=kaHoja(estacion),fila=kaBuscarFilaRecientePorId(hoja,id,1000);if(fila<0)fila=kaBuscarFilaPorIdCompleta(hoja,id);if(fila>0)hoja.deleteRow(fila);return{result:fila>0?"ELIMINADO":"NO ENCONTRADO",id:id};}finally{lock.releaseLock();}}
function kaGuardar(registro){var d=kaNormalizarRegistro(registro),lock=LockService.getScriptLock();if(!lock.tryLock(5000))throw new Error("La base está ocupada. El registro será reintentado.");try{var hoja=kaHoja(d.estacion),cache=CacheService.getScriptCache(),cacheKey="id_"+Utilities.base64EncodeWebSafe(d.estacion+"|"+d.id).substring(0,220),fila=kaBuscarFilaRecientePorId(hoja,d.id,1000);if(d.eliminado===true){if(fila<0)fila=kaBuscarFilaPorIdCompleta(hoja,d.id);if(fila>0)hoja.deleteRow(fila);cache.remove(cacheKey);return {result:fila>0?"ELIMINADO":"NO ENCONTRADO",data:{id:d.id,recurso:d.recurso}};}if(fila>0){cache.put(cacheKey,"1",21600);return {result:"YA REGISTRADO",data:{id:d.id,recurso:d.recurso}};}var nueva=Math.max(2,hoja.getLastRow()+1);hoja.getRange(nueva,1,1,8).setValues([[d.codigo,d.evento,d.fecha_hora,d.operador,d.estacion,d.recurso,d.id,d.detalle]]);cache.put(cacheKey,"1",21600);return {result:"OK",data:{id:d.id,recurso:d.recurso}};}finally{lock.releaseLock();}}
function kaNormalizarRegistro(r){if(!r||typeof r!=="object")throw new Error("Registro inválido.");var e=kaEstacion(r.estacion);if(KA_HOJAS.indexOf(e)===-1)throw new Error("Estación inválida: "+e);var d={codigo:kaTexto(r.codigo),evento:kaTexto(r.evento).toUpperCase(),fecha_hora:kaTexto(r.fecha_hora||r.fechaHora),operador:kaTexto(r.operador),estacion:e,recurso:kaRecurso(r),detalle:kaTexto(r.detalle),id:kaTexto(r.id||r.id_registro),eliminado:r.eliminado===true};if(!d.codigo)throw new Error("Código vacío.");if(!d.id)throw new Error("ID vacío.");if(["BALANZA","DESCARGUIO","CHANCADO","MUESTREO","SECADO","PULVERIZADO"].indexOf(d.estacion)>=0&&!d.recurso)throw new Error("RECURSO vacío para "+d.estacion+".");return d;}
function kaRecurso(r){var e=kaEstacion(r.estacion),x=kaTexto(r.recurso).toUpperCase();if(x)return x;if(e==="BALANZA"&&kaTexto(r.tipo_mineral))return kaTexto(r.tipo_mineral).toUpperCase();if(e==="MUESTREO"&&kaTexto(r.ubicacion))return kaTexto(r.ubicacion).toUpperCase();if(e==="DESCARGUIO"&&kaTexto(r.tolva))return"T"+kaTexto(r.tolva).replace(/^T/i,"");if(e==="CHANCADO"&&kaTexto(r.circuito))return"C"+kaTexto(r.circuito).replace(/^C/i,"");if(e==="SECADO"&&kaTexto(r.horno))return"H"+kaTexto(r.horno).replace(/^H/i,"");if(e==="PULVERIZADO"&&kaTexto(r.molino))return"M"+kaTexto(r.molino).replace(/^M/i,"");return"";}
function kaBuscarFilaRecientePorId(hoja,id,maxFilas){var n=hoja.getLastRow();if(!id||n<2)return-1;var inicio=Math.max(2,n-Math.max(1,Number(maxFilas||1000))+1);var valores=hoja.getRange(inicio,7,n-inicio+1,1).getDisplayValues();for(var i=valores.length-1;i>=0;i--){if(kaTexto(valores[i][0])===id)return inicio+i;}return-1;}
function kaBuscarFilaPorIdCompleta(hoja,id){var n=hoja.getLastRow();if(!id||n<2)return-1;var f=hoja.getRange(2,7,n-1,1).createTextFinder(id).matchEntireCell(true).findNext();return f?f.getRow():-1;}
function kaListarKanban(){
  var h=kaLibro().getSheetByName("KANBAN"),out=[];
  if(!h)throw new Error('No existe la hoja "KANBAN".');
  var lastRow=h.getLastRow(),lastCol=h.getLastColumn();
  if(lastRow<1||lastCol<1)return {data:out,meta:{hoja:"KANBAN",fila_encabezado:0,filas:0}};

  var vals=h.getRange(1,1,lastRow,lastCol).getDisplayValues();

  function normalCab(v){
    return kaTexto(v).toUpperCase()
      .replace(/[ÁÀÄÂ]/g,"A").replace(/[ÉÈËÊ]/g,"E")
      .replace(/[ÍÌÏÎ]/g,"I").replace(/[ÓÒÖÔ]/g,"O")
      .replace(/[ÚÙÜÛ]/g,"U").replace(/Ñ/g,"N")
      .replace(/\s+/g," ").trim();
  }

  // Busca el encabezado real en las primeras 15 filas.
  // Esto permite que arriba exista el título grande "TABLERO KAMBAN".
  var headerRow=-1,head=[];
  var limite=Math.min(15,vals.length);
  for(var rr=0;rr<limite;rr++){
    var candidato=vals[rr].map(normalCab);
    var tieneCodigo=candidato.indexOf("CODIGO")>=0;
    var tieneEstado=candidato.indexOf("ESTADO")>=0;
    var tieneFecha=candidato.indexOf("FECHA")>=0;
    if(tieneCodigo&&(tieneEstado||tieneFecha)){
      headerRow=rr;
      head=candidato;
      break;
    }
  }
  if(headerRow<0){
    throw new Error('No encontré la fila de encabezados en "KANBAN". Debe contener al menos CODIGO y FECHA o ESTADO.');
  }

  function col(nombres){
    for(var i=0;i<nombres.length;i++){
      var k=head.indexOf(normalCab(nombres[i]));
      if(k>=0)return k;
    }
    return -1;
  }

  var cFecha=col(["FECHA"]),
      cCodigo=col(["CODIGO","CÓDIGO"]),
      cBal=col(["BALANZA"]),
      cDes=col(["DESCARGUIO","DESCARGUÍO"]),
      cCha=col(["CHANCADO"]),
      cMue=col(["MUESTREO"]),
      cSec=col(["SECADO"]),
      cPul=col(["PULVERIZADO"]),
      cCua=col(["CUARTEO SELLADO","CUARTEOSELLADO"]),
      cAte=col(["ATENCION AL CLIENTE","ATENCIÓN AL CLIENTE"]),
      cLead=col(["LEAD TIME"]),
      cEstado=col(["ESTADO"]);

  if(cCodigo<0)throw new Error('No encontré la columna CODIGO en "KANBAN".');

  function valor(v,c){return c>=0?(v[c]||""):"";}

  for(var r=headerRow+1;r<vals.length;r++){
    var v=vals[r],codigo=kaTexto(valor(v,cCodigo));
    if(!codigo)continue;
    out.push({
      fecha:valor(v,cFecha),
      codigo:codigo,
      balanza:valor(v,cBal),
      descarguio:valor(v,cDes),
      chancado:valor(v,cCha),
      muestreo:valor(v,cMue),
      secado:valor(v,cSec),
      pulverizado:valor(v,cPul),
      cuarteo_sellado:valor(v,cCua),
      atencion_al_cliente:valor(v,cAte),
      lead_time:valor(v,cLead),
      estado:valor(v,cEstado)
    });
  }

  return {
    data:out,
    meta:{
      hoja:"KANBAN",
      fila_encabezado:headerRow+1,
      filas:out.length,
      ultima_fila:lastRow,
      ultima_columna:lastCol
    }
  };
}
function kaListar(){var libro=kaLibro(),out=[];KA_HOJAS.forEach(function(nombre){var h=libro.getSheetByName(nombre);if(!h||h.getLastRow()<2)return;h.getRange(2,1,h.getLastRow()-1,7).getDisplayValues().forEach(function(r){if(!kaTexto(r[0]))return;out.push({codigo:r[0],evento:r[1],fecha_hora:r[2],operador:r[3],estacion:r[4]||nombre,recurso:r[5],id:r[6],sincronizado:true,eliminado:false});});});return out;}
function kaTexto(v){return String(v===null||v===undefined?"":v).trim()}
function kaEstacion(v){return kaTexto(v).toUpperCase().replace(/[ÁÀÄÂ]/g,"A").replace(/[ÉÈËÊ]/g,"E").replace(/[ÍÌÏÎ]/g,"I").replace(/[ÓÒÖÔ]/g,"O").replace(/[ÚÙÜÛ]/g,"U").replace(/Ñ/g,"N")}
function kaError(e){return String(e&&e.message?e.message:e)}
function kaSalida(o,cb){var j=JSON.stringify(o);if(cb&&/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb))return ContentService.createTextOutput(cb+"("+j+");").setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(j).setMimeType(ContentService.MimeType.JSON);}
function PRUEBA_PING_0002_8_3(){return{ok:true,version:KA_VERSION}}

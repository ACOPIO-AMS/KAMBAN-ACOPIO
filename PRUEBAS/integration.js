const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.basename(__dirname)==='PRUEBAS'?path.resolve(__dirname,'..'):path.resolve(__dirname,'../kanban_290_ligero');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');

class Sheet {
  constructor(name){this.name=name;this.rows=[[]];this.maxColumns=12;}
  getName(){return this.name}
  getLastRow(){let i=this.rows.length;while(i>0&&!this.rows[i-1].some(x=>x!==''&&x!=null))i--;return i}
  getLastColumn(){return Math.max(0,...this.rows.map(x=>x.length))}
  getMaxColumns(){return this.maxColumns}
  insertColumnsAfter(n,count){this.maxColumns+=count}
  setFrozenRows(){}
  copyTo(){const copy=new Sheet(this.name+'_COPIA');copy.rows=this.rows.map(r=>r.slice());copy.maxColumns=this.maxColumns;sheets.set(copy.name,copy);return copy}
  setName(name){sheets.delete(this.name);this.name=name;sheets.set(name,this);return this}
  deleteRow(row){this.rows.splice(row-1,1)}
  getRange(row,col,numRows=1,numCols=1){
    const sheet=this;
    return {
      setValues(values){for(let i=0;i<numRows;i++){const r=row+i-1;sheet.rows[r]??=[];for(let j=0;j<numCols;j++)sheet.rows[r][col+j-1]=values[i][j]}return this},
      getDisplayValues(){return Array.from({length:numRows},(_,i)=>Array.from({length:numCols},(_,j)=>String(sheet.rows[row+i-1]?.[col+j-1]??'')))},
      getDisplayValue(){return String(sheet.rows[row-1]?.[col-1]??'')},
      getValue(){return sheet.rows[row-1]?.[col-1]??''},
      setNumberFormat(){return this},
      createTextFinder(term){let entire=false;return{
        matchEntireCell(v){entire=v;return this},
        findNext(){for(let i=row-1;i<row-1+numRows;i++){for(let j=col-1;j<col-1+numCols;j++){
          const value=String(sheet.rows[i]?.[j]??'');if(entire?value===term:value.includes(term))return{getRow:()=>i+1};
        }}return null}
      }}
    }
  }
}
const sheets=new Map();
const book={getSheetByName:n=>sheets.get(n)||null,insertSheet:n=>{const h=new Sheet(n);sheets.set(n,h);return h}};
const cacheMap=new Map();
const properties=new Map();
let failBatchLockOnce=false;
const server={
  SpreadsheetApp:{openById:()=>book,flush(){}},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k)||null,setProperty:(k,v)=>properties.set(k,v)})},
  CacheService:{getScriptCache:()=>({get:k=>cacheMap.get(k),put:(k,v)=>cacheMap.set(k,v),remove:k=>cacheMap.delete(k)})},
  LockService:{getScriptLock:()=>({tryLock:(ms)=>{if(ms===15000&&failBatchLockOnce){failBatchLockOnce=false;return false}return true},releaseLock(){}}),getUserLock:()=>({tryLock:()=>true,releaseLock(){}})},
  Utilities:{base64EncodeWebSafe:s=>Buffer.from(s).toString('base64url'),base64DecodeWebSafe:s=>Buffer.from(s,'base64url'),newBlob:b=>({getDataAsString:()=>Buffer.from(b).toString('utf8')})},
  ContentService:{MimeType:{JSON:'JSON',JAVASCRIPT:'JAVASCRIPT'},createTextOutput:s=>({value:s,setMimeType(){return this}})},
  console
};
vm.createContext(server);
new vm.Script(read('APPS_SCRIPT/INGRESO_DE_DATOS.gs')).runInContext(server);
function remote(params){return JSON.parse(server.doGet({parameter:params}).value)}

const storage=new Map();let backupFails=false,saveBatchRequests=0,pingRequests=0;
const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem(k,v){if(backupFails&&k==='kamban_acopio_db_respaldo_v0001')throw Error('Quota');storage.set(k,v)},removeItem:k=>storage.delete(k)};
const elements=new Map();
function element(id){if(!elements.has(id)){const classes=new Set(['hide']);elements.set(id,{value:id==='filtroEstado'?'TODOS':'',innerHTML:'',textContent:'',style:{},options:[],listeners:{},classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)},addEventListener(n,fn){this.listeners[n]=fn},focus(){},querySelector(){return{set textContent(v){this.value=v}}}})}return elements.get(id)}
let updateChecks=0;
const browser={localStorage,navigator:{onLine:true,serviceWorker:{getRegistration:async()=>({update:async()=>{updateChecks++}})}},console:{...console,warn(){}},URLSearchParams,Date,Math,Map,Set,encodeURIComponent,unescape,btoa:s=>Buffer.from(s,'binary').toString('base64'),
  window:{addEventListener(){}},document:{addEventListener(){},getElementById:element},
  setTimeout:(fn,delay)=>{if(delay<100)queueMicrotask(fn);return 1},clearTimeout(){},setInterval:()=>1,clearInterval(){},alert(){},
  render(){},actualizarAdmin(){}
};
vm.createContext(browser);
for(const file of ['config.js','utilidades.js','db.js','reglas.js','tiempos.js','sincronizacion.js','admin.js','seguimiento.js','app.js'])
  new vm.Script(read('js/'+file),{filename:file}).runInContext(browser);
browser.jsonpSeguro=async params=>{
  if(params.action==='ping')pingRequests++;
  if(params.action==='save_batch'){saveBatchRequests++;
    const list=JSON.parse(Buffer.from(params.lote,'base64url').toString('utf8'));
    return remote({action:'save_batch',lote:Buffer.from(JSON.stringify(list)).toString('base64url')});
  }
  return remote(params);
};
const evalBrowser=code=>vm.runInContext(code,browser);
const record=(id,event,time,resource='C1')=>({id,codigo:'12345',evento:event,fecha_hora:'2026-09-27 '+time,operador:'OPERADOR',estacion:'CHANCADO',recurso:resource,sincronizado:false});
async function run(){
  assert.deepEqual(remote({action:'ping'}),{ok:true,sistema:'KANBAN',version:'0002.9.0',revision:'0002.9.10',build:'inventario-tabla-12',tiempos_base:true,inventario:true,sync_remota:true,actualizacion_remota:true,sync_token:'',update_token:''});
  assert.equal(evalBrowser('endpoint()'),'https://script.google.com/macros/s/AKfycbx_UwdiDhTvcWVAdygIIGh4otJXp22aFHFQ2t5QLJUySxDZBs_lh9ER0la_aA0gX-o/exec');
  assert.equal(evalBrowser('validarSecuencia("12345","CHANCADO","","C1").ok'),false);
  evalBrowser('window.datosRemotos=[{codigo:"12345",fecha:"2026-09-27",estado:"EN PROCESO"}];renderSeguimiento()');
  assert.match(element('kanban').innerHTML,/12345/);
  browser.navigator.onLine=false;
  await evalBrowser('procesarPendientesSync(false)');
  browser.navigator.onLine=true;
  const records=[record('a','INICIO','10:00:00'),record('b','PARADA','10:10:00'),record('c','REINICIO','10:15:00'),record('d','FINAL','10:30:00')];
  for(const item of records){browser.item=item;evalBrowser('agregarRegistro(item)')}
  assert.equal(evalBrowser('pendientesSyncOrdenados().length'),4);
  const compacto=evalBrowser('codificarLote([crearPayload(datos()[0]),crearPayload(datos()[1])])');
  const previo=evalBrowser('btoa(unescape(encodeURIComponent(JSON.stringify([crearPayload(datos()[0]),crearPayload(datos()[1])]))))');
  assert.ok(compacto.length<previo.length*0.7,`Lote compacto: ${compacto.length}; previo: ${previo.length}`);
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(evalBrowser('pendientesSyncOrdenados().length'),0);
  assert.equal(saveBatchRequests,1,'Cuatro eventos deben viajar en una sola solicitud');
  const pingPrevio=pingRequests;evalBrowser('syncBackendVerificadoEn=0');
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(pingRequests,pingPrevio,'Sin pendientes no debe llamar al servidor');
  const legado=record('a','INICIO','10:00:00');
  const respuestaLegada=remote({action:'save_batch',lote:Buffer.from(JSON.stringify([legado])).toString('base64url')});
  assert.equal(respuestaLegada.data[0].result,'YA REGISTRADO');
  const sheet=sheets.get('CHANCADO');
  assert.equal(sheet.getLastRow(),5);
  assert.deepEqual(sheet.rows[4].slice(8,12),['','00:05:00','00:25:00','']);
  const originalGetRange=sheet.getRange.bind(sheet);
  let lecturasFilas=0;
  sheet.getRange=(row,col,numRows,numCols)=>{
    if(col===1&&numRows>1&&numCols===8)lecturasFilas++;
    return originalGetRange(row,col,numRows,numCols);
  };
  server.kaActualizarTiemposCodigos(sheet,['12345','99999']);
  assert.equal(lecturasFilas,1,'Un lote con varios códigos debe leer la estación una vez');
  sheet.getRange=originalGetRange;
  evalBrowser('actualizarRegistro("d",{sincronizado:false})');
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(sheet.getLastRow(),5);
  assert.equal(evalBrowser('pendientesSyncOrdenados().length'),0);
  browser.item=record('d','FINAL','10:30:00','C2');
  evalBrowser('actualizarRegistro("d",{recurso:"C2",sincronizado:false})');
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(evalBrowser('pendientesSyncOrdenados().length'),1);
  assert.match(evalBrowser('obtenerRegistro("d").sync_ultimo_error'),/otro recurso/);
  evalBrowser('actualizarRegistro("d",{recurso:"C1",sincronizado:true})');
  storage.set('kamban_acopio_db_v0001','broken json');
  assert.equal(evalBrowser('datos().length'),4);
  backupFails=true;
  browser.item=record('e','INICIO','11:00:00');
  evalBrowser('agregarRegistro(item)');
  assert.equal(evalBrowser('datos().length'),5);
  backupFails=false;
  await evalBrowser('procesarPendientesSync(false)');
  browser.item={...record('f','INICIO','11:00:00'),codigo:'55555'};
  evalBrowser('agregarRegistro(item)');
  const originalJsonp=browser.jsonpSeguro;
  browser.jsonpSeguro=async p=>p.action==='ping'?{ok:true,version:'0002.9.0'}:originalJsonp(p);
  evalBrowser('syncBackendVerificadoEn=0');
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(evalBrowser('pendientesSyncOrdenados().length'),1);
  assert.match(evalBrowser('syncUltimoError'),/tiempos_base/);
  browser.jsonpSeguro=originalJsonp;
  failBatchLockOnce=true;
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(evalBrowser('pendientesSyncOrdenados().length'),1);
  assert.match(evalBrowser('syncUltimoError'),/Base ocupada/);
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(evalBrowser('pendientesSyncOrdenados().length'),0);
  const descarga=[
    ['de1','INICIO','10:00:00'],['de2','PARADA','10:10:00'],
    ['de3','REINICIO','10:12:00'],['de4','PARADA','10:20:00'],
    ['de5','REINICIO','10:25:00'],['de6','FINAL','10:40:00']
  ];
  for(const [id,ev,time] of descarga){
    browser.item={...record(id,ev,time,'T1'),codigo:'77777',estacion:'DESCARGUIO'};
    evalBrowser('agregarRegistro(item)');
    if(ev==='PARADA'){
      assert.equal(evalBrowser('eventoAutomatico("77777","DESCARGUIO")'),'REINICIO');
      assert.equal(evalBrowser('validarSecuencia("77777","DESCARGUIO","FINAL","T1").ok'),false);
    }
  }
  assert.equal(evalBrowser('permiteParada("DESCARGUIO")'),true);
  assert.equal(evalBrowser('validarSecuencia("77777","DESCARGUIO","PARADA","T1").ok'),false);
  assert.equal(evalBrowser('calcularTiemposProceso(datos()).find(t=>t.codigo==="77777").proceso'),33*60);
  await evalBrowser('procesarPendientesSync(false)');
  const descargaHoja=sheets.get('DESCARGUIO');
  assert.equal(descargaHoja.getLastRow(),7);
  assert.deepEqual(descargaHoja.rows[6].slice(8,12),['','00:07:00','00:33:00','']);
  const muestreoReal=book.insertSheet('MUESTREO');
  muestreoReal.getRange(1,9,1,4).setValues([['ANTIGUO I','ANTIGUO J','ANTIGUO K','ANTIGUO L']]);
  muestreoReal.getRange(2,9,1,4).setValues([['DATO I','DATO J','DATO K','DATO L']]);
  for(const [id,event,time] of [['m1','RECEPCION','12:00:00'],['m2','INICIO','12:05:00'],['m3','FINAL','12:15:00']]){
    browser.item={...record(id,event,time,'UBICACION 1'),estacion:'MUESTREO',codigo:'54321'};
    evalBrowser('agregarRegistro(item)');
  }
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(evalBrowser('pendientesSyncOrdenados().length'),0);
  assert.deepEqual(muestreoReal.rows[0].slice(8,12),['ANTIGUO I','ANTIGUO J','ANTIGUO K','ANTIGUO L']);
  assert.deepEqual(muestreoReal.rows[1].slice(8,12),['DATO I','DATO J','DATO K','DATO L']);
  assert.deepEqual(muestreoReal.rows[0].slice(12,16),['ESPERA','PARADAS','PROCESO EFECTIVO','PERMANENCIA']);
  assert.deepEqual(muestreoReal.rows[4].slice(12,16),['00:05:00','00:00:00','00:10:00','00:15:00']);
  assert.equal(server.kaColumnaTiempos(muestreoReal),13);
  browser.item={...record('sin-recurso','RECEPCION','11:30:00',''),codigo:'60000',sync_bloqueado:true,sync_ultimo_error:'Falta RECURSO en 60000.'};
  evalBrowser('agregarRegistro(item)');
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(sheet.rows.find(r=>r[6]==='sin-recurso')[5],'');
  assert.equal(evalBrowser('obtenerRegistro("sin-recurso").sincronizado'),true);
  server.kaHoja('MUESTREO');
  assert.equal(muestreoReal.getLastColumn(),16);
  const muestreo=[{fila:2,valores:['54321','RECEPCION','2026-09-27 09:00:00']},{fila:3,valores:['54321','EN STOCK','2026-09-27 09:10:00']},{fila:4,valores:['54321','SALIDA STOCK','2026-09-27 09:30:00']},{fila:5,valores:['54321','FINAL','2026-09-27 09:50:00']}];
  assert.deepEqual(JSON.parse(JSON.stringify(server.kaCalcularFilasTiempos(muestreo,'MUESTREO')[0].valores)),['00:30:00','00:00:00','00:20:00','00:50:00']);
  evalBrowser('iniciar()');
  element('operador').value='OPERADOR';element('tipoMineral').value='LOTE';element('estadoMineral').value='SECO';
  const before=evalBrowser('datos().length');
  element('codigo').value='9876';element('codigo').listeners.input();
  assert.equal(evalBrowser('datos().length'),before);
  element('codigo').value='98765';element('codigo').listeners.input();
  assert.equal(evalBrowser('datos().length'),before+1);
  assert.equal(evalBrowser('datos()[0].codigo'),'98765');
  assert.equal(element('codigo').value,'');
  const inventario=book.insertSheet('INVENTARIO');
  inventario.getRange(1,1).setValues([['Tabla1']]);
  inventario.getRange(2,1,1,6).setValues([['CODIGO','n° LOTE','FECHA Y HORA','RECURSO','OPERARIO','ID REGISTRO']]);
  inventario.getRange(3,1,1,6).setValues([['ANTERIOR','00001','2026-09-27 08:00:00','B-1','ANA','ID-VIEJO']]);
  element('estacion').value='INVENTARIO';evalBrowser('configurarCamposEspeciales()');
  assert.equal(element('pendientesBox').classList.contains('hide'),true);
  assert.equal(element('codigo').maxLength,80);
  element('inventarioSerie').value='A';element('inventarioCancha').value='5';
  element('codigo').value='20Set0627PPO68843101240MINERA68843';element('codigo').listeners.input();
  assert.equal(evalBrowser('datos()[0].codigo'),'98765');
  element('registrarInventarioBtn').onclick();
  assert.equal(evalBrowser('datos()[0].codigo'),'PPO68843');
  assert.equal(evalBrowser('datos()[0].recurso'),'A-5');
  assert.match(read('index.html'),/<select id="inventarioSerie"[^>]*>[\s\S]*?<option value="C">C<\/option><\/select>/);
  assert.match(read('index.html'),/<select id="inventarioCancha"[^>]*>[\s\S]*?<option value="8">8<\/option><\/select>/);
  assert.equal(element('inventarioSerie').value,'A');
  assert.equal(element('inventarioCancha').value,'5');
  assert.match(element('tablaLocal').innerHTML,/<td>68843<\/td>/);
  element('inventarioSerie').value='';element('inventarioCancha').value='';element('operador').value='';
  evalBrowser('cargarPreferencias();configurarCamposEspeciales()');
  assert.equal(element('inventarioSerie').value,'A');
  assert.equal(element('inventarioCancha').value,'5');
  assert.equal(element('operador').value,'OPERADOR');
  assert.equal(evalBrowser('extraerCodigoInventario("20Set0627PPO68843101240MINERA68843")'),'PPO68843');
  assert.equal(evalBrowser('extraerCodigoInventario("22525")'),'PPO22525');
  assert.equal(evalBrowser('extraerCodigoInventario("00001")'),'PPO00001');
  assert.equal(evalBrowser('extraerCodigoInventario("68901ABC")'),'');
  assert.equal(evalBrowser('extraerCodigoInventario("26Ago0914PP068043373450")'),'PPO68043');
  assert.equal(evalBrowser('extraerCodigoInventario("Aaaa68901")'),'');
  assert.equal(evalBrowser('extraerCodigoInventario("PPO68843OTROPPO68043")'),'');
  const cantidadInventario=evalBrowser('datos().length');
  element('codigo').value='Aaaa68901';element('registrarInventarioBtn').onclick();
  assert.equal(evalBrowser('datos().length'),cantidadInventario);
  element('codigo').value='20Set0627PPO68843101240MINERA68843';element('inventarioSerie').value='D';
  element('registrarInventarioBtn').onclick();
  assert.equal(evalBrowser('datos().length'),cantidadInventario);
  element('inventarioSerie').value='A';element('inventarioCancha').value='9';
  element('registrarInventarioBtn').onclick();
  assert.equal(evalBrowser('datos().length'),cantidadInventario);
  element('inventarioCancha').value='5';element('codigo').value='';
  element('estacion').value='CHANCADO';element('estacion').listeners.change();
  assert.equal(element('pendientesBox').classList.contains('hide'),false);
  element('estacion').value='INVENTARIO';element('estacion').listeners.change();
  assert.equal(element('inventarioSerie').value,'A');
  assert.equal(element('inventarioCancha').value,'5');
  assert.equal(element('operador').value,'OPERADOR');
  assert.equal(evalBrowser('pendientesPorFinalizar().some(x=>x.estacion==="INVENTARIO")'),false);
  assert.match(element('pendientesTabla').innerHTML,/Recurso/);
  assert.match(element('pendientesTabla').innerHTML,/<td>C1<\/td>/);
  // Pendiente legado: se envía el PPO extraído sin cambiar su ID local.
  browser.legadoInv={id:'inv-legado',codigo:'7May2200PPO64198334530COMPA',evento:'LECTURA',fecha_hora:'2026-10-02 13:00:00',operador:'OPERADOR',estacion:'INVENTARIO',recurso:'B-2',sincronizado:false};
  evalBrowser('agregarRegistro(legadoInv)');
  assert.equal(evalBrowser('crearPayload(obtenerRegistro("inv-legado")).codigo'),'PPO64198');
  const responderActual=browser.jsonpSeguro;
  browser.jsonpSeguro=async p=>p.action==='ping'?{ok:true,version:'0002.9.0',tiempos_base:true}:responderActual(p);
  evalBrowser('syncBackendVerificadoEn=0');
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(evalBrowser('obtenerRegistro("inv-legado").sincronizado'),false);
  assert.match(evalBrowser('syncUltimoError'),/aún no admite INVENTARIO/);
  browser.jsonpSeguro=responderActual;
  evalBrowser('syncBackendVerificadoEn=0');
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(evalBrowser('obtenerRegistro("inv-legado").sincronizado'),true);
  assert.equal(evalBrowser('obtenerRegistro("inv-legado").codigo'),'PPO64198');
  assert.equal(evalBrowser('obtenerRegistro("inv-legado").lectura_original'),'7May2200PPO64198334530COMPA');
  assert.deepEqual(inventario.rows[1].slice(0,6),['CODIGO','n° LOTE','FECHA Y HORA','RECURSO','OPERARIO','ID REGISTRO']);
  assert.deepEqual(inventario.rows[2].slice(0,6),['ANTERIOR','00001','2026-09-27 08:00:00','B-1','ANA','ID-VIEJO']);
  assert.deepEqual(inventario.rows[3].slice(0,5),['PPO68843','68843',evalBrowser('datos().find(r=>r.codigo==="PPO68843").fecha_hora'),'A-5','OPERADOR']);
  element('codigo').value='26Ago0914PPO68043373450';element('codigo').listeners.input();
  element('codigo').listeners.keydown({key:'Enter',preventDefault(){}});
  await evalBrowser('procesarPendientesSync(false)');
  assert.deepEqual(inventario.rows[4].slice(0,5),['PPO64198','64198','2026-10-02 13:00:00','B-2','OPERADOR']);
  assert.deepEqual(inventario.rows[5].slice(0,5),['PPO68043','68043',evalBrowser('datos().find(r=>r.codigo==="PPO68043").fecha_hora'),'A-5','OPERADOR']);
  const invId=inventario.rows[3][5];
  evalBrowser('actualizarRegistro('+JSON.stringify(invId)+',{sincronizado:false})');
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(inventario.getLastRow(),6);
  assert.equal(evalBrowser('obtenerRegistro('+JSON.stringify(invId)+').sincronizado'),true);
  assert.equal(remote({action:'delete',estacion:'INVENTARIO',id:invId}).result,'ELIMINADO');
  assert.deepEqual(inventario.rows[2].slice(0,6),['ANTERIOR','00001','2026-09-27 08:00:00','B-1','ANA','ID-VIEJO']);
  assert.deepEqual(inventario.rows[3].slice(0,6),['','','','','','']);
  inventario.getRange(2,1).setValues([['OTRO ENCABEZADO']]);
  const errorCabecera=remote({action:'save_batch',lote:Buffer.from(JSON.stringify([{
    codigo:'20Set0627PPO68843101240MINERA68843',evento:'LECTURA',fecha_hora:'2026-09-28 10:00:00',
    operador:'OPERADOR',estacion:'INVENTARIO',recurso:'A-5',id:'nuevo-id'
  }])).toString('base64url')});
  assert.match(errorCabecera.data[0].error,/no se encontró la tabla A:F/);
  assert.equal(inventario.getLastRow(),6);
  inventario.getRange(2,1).setValues([['CODIGO']]);
  inventario.getRange(7,1,2,6).setValues([
    ['20Set0627PPO68843101240MINERA68843','68843','2026-09-28 12:00:00','A-5','ANA','ID-HISTORICO'],
    ['Aaaa68901','68901','2026-09-28 12:01:00','A-5','ANA','ID-SIN-PATRON']
  ]);
  const revision=server.REVISAR_INVENTARIO_PPO();
  assert.equal(revision.corregibles,1);
  assert.equal(revision.sinPatron,2); // ANTERIOR y Aaaa68901 requieren revisión manual.
  assert.equal(revision.respaldo,'');
  assert.equal(inventario.rows[6][0],'20Set0627PPO68843101240MINERA68843');
  const correccion=server.CORREGIR_INVENTARIO_PPO();
  assert.equal(correccion.corregibles,1);
  assert.match(correccion.respaldo,/^INVENTARIO_RESPALDO_\d+$/);
  assert.equal(sheets.get(correccion.respaldo).rows[6][0],'20Set0627PPO68843101240MINERA68843');
  assert.deepEqual(inventario.rows[6].slice(0,2),['PPO68843','68843']);
  assert.equal(inventario.rows[7][0],'Aaaa68901');
  assert.equal(server.REVISAR_INVENTARIO_PPO().corregibles,0);
  const incorrecto=remote({action:'save_batch',lote:Buffer.from(JSON.stringify([{
    codigo:'Aaaa68901',evento:'LECTURA',fecha_hora:'2026-09-28 10:00:00',operador:'ANA',estacion:'INVENTARIO',recurso:'A-5',id:'INVALIDO'
  }])).toString('base64url')});
  assert.match(incorrecto.data[0].error,/sin un único código PPO/);
  assert.equal(inventario.getLastRow(),8);
  element('codigo').value='22525';element('registrarInventarioBtn').onclick();
  assert.equal(evalBrowser('datos()[0].codigo'),'PPO22525');
  assert.equal(evalBrowser('datos()[0].detalle'),'22525');
  assert.equal(evalBrowser('datos()[0].lectura_original'),'22525');
  await evalBrowser('procesarPendientesSync(false)');
  assert.ok(inventario.rows.some(r=>r[0]==='PPO22525'&&r[1]==='22525'));
  const manualDirecto=remote({action:'save_batch',lote:Buffer.from(JSON.stringify([{
    codigo:'12345',evento:'LECTURA',fecha_hora:'2026-09-28 10:00:00',operador:'ANA',estacion:'INVENTARIO',recurso:'A-5',id:'ID-MANUAL-DIRECTO'
  }])).toString('base64url')});
  assert.equal(manualDirecto.data[0].ok,true);
  assert.ok(inventario.rows.some(r=>r[0]==='PPO12345'&&r[1]==='12345'&&r[5]==='ID-MANUAL-DIRECTO'));
  // La orden remota sobrevive a dispositivos desconectados y nunca confirma sin ID.
  assert.equal(remote({action:'request_sync',pin:'mal'}).ok,false);
  const orden=remote({action:'request_sync',pin:'1234'});
  assert.equal(orden.ok,true);
  assert.ok(orden.data.sync_token);
  assert.equal(remote({action:'signal'}).sync_token,orden.data.sync_token);
  assert.equal(remote({action:'ping'}).sync_token,orden.data.sync_token);
  assert.equal(evalBrowser('recibirSolicitudRemota('+JSON.stringify(orden.data.sync_token)+')'),true);
  assert.equal(evalBrowser('recibirSolicitudRemota('+JSON.stringify(orden.data.sync_token)+')'),false);
  assert.equal(storage.get('kamban_sync_orden_pendiente_v1'),'1');
  browser.navigator.onLine=false;
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(storage.get('kamban_sync_orden_pendiente_v1'),'1');
  browser.navigator.onLine=true;
  await evalBrowser('procesarPendientesSync(false)');
  assert.equal(storage.get('kamban_sync_orden_pendiente_v1'),undefined);
  browser.navigator.onLine=false;
  await evalBrowser('solicitarSyncEquipos(true)');
  assert.equal(storage.get('kamban_solicitud_remota_pendiente_v1'),'1');
  browser.navigator.onLine=true;
  await evalBrowser('solicitarSyncEquipos(false)');
  assert.equal(storage.get('kamban_solicitud_remota_pendiente_v1'),undefined);
  assert.match(element('ordenSyncEstado').textContent,/Solicitud enviada/);
  assert.equal(remote({action:'signal'}).sync_token,storage.get('kamban_sync_orden_token_v1'));
  const estadoRemoto=remote({action:'devices'});
  assert.equal(estadoRemoto.sync_token,storage.get('kamban_sync_orden_token_v1'));
  assert.ok(Array.isArray(estadoRemoto.data));
  await evalBrowser('reportarEstadoDispositivo(true)');
  assert.ok(remote({action:'devices'}).data.some(d=>d.version==='0002.9.10-inventario-manual'));

  assert.equal(remote({action:'request_update',pin:'mal'}).ok,false);
  browser.navigator.onLine=false;
  await evalBrowser('solicitarActualizacionEquipos()');
  assert.equal(storage.get('kamban_solicitud_actualizacion_pendiente_v1'),'1');
  browser.navigator.onLine=true;
  await evalBrowser('solicitarActualizacionEquipos()');
  assert.equal(storage.get('kamban_solicitud_actualizacion_pendiente_v1'),undefined);
  const tokenUpdate=remote({action:'signal'}).update_token;
  assert.ok(tokenUpdate);
  assert.equal(remote({action:'ping'}).update_token,tokenUpdate);
  assert.equal(remote({action:'heartbeat',dispositivo_id:'test-disp',frontend_version:'0002.9.10-inventario-manual'}).data.update_token,tokenUpdate);
  assert.equal(storage.get('kamban_actualizacion_orden_token_v1'),tokenUpdate);
  await evalBrowser('verificarActualizacionRemota()');
  assert.equal(updateChecks,1);
  assert.equal(storage.get('kamban_actualizacion_pendiente_v1'),undefined);
  await evalBrowser('reportarEstadoDispositivo(true)');
  const equipos=remote({action:'devices'});
  assert.ok(equipos.data.some(d=>d.update_token_ack===tokenUpdate));
  evalBrowser('actualizarControlDispositivos()');
  await new Promise(r=>setImmediate(r));
  assert.match(element('controlDispositivos').innerHTML,/Actualización/);
  assert.match(element('controlDispositivos').innerHTML,/Transferencia/);

  assert.equal(evalBrowser('recibirSolicitudActualizacion('+JSON.stringify(tokenUpdate)+')'),false);
  assert.match(read('index.html'),/id="solicitarActualizacionEquiposBtn"/);
  assert.match(read('service-worker.js'),/0002\.9\.10-inventario-manual/);
  assert.match(read('index.html'),/id="solicitarSyncEquiposBtn"/);
  assert.match(read('index.html'),/id="pendientesDiagnostico"/);
  element('adminModal').classList.remove('hide');
  evalBrowser('actualizarAdmin()');
  assert.match(element('pendientesDiagnostico').innerHTML,/Este equipo no tiene registros pendientes/);
  const jsonpAntes=browser.jsonpSeguro;
  let llamadasLargas=0;
  browser.jsonpSeguro=async params=>{
    if(params.action==='save_batch'){
      llamadasLargas++;
      const registros=JSON.parse(Buffer.from(params.lote,'base64url').toString('utf8'));
      return {ok:true,data:registros.map(x=>({ok:true,id:x[7],recurso:x[5]}))};
    }
    return jsonpAntes(params);
  };
  browser.largos=Array.from({length:8},(_,i)=>({codigo:'A'.repeat(75)+String(i).padStart(5,'0'),evento:'LECTURA',fecha_hora:'2026-09-27 10:00:00',operador:'OPERADOR',estacion:'INVENTARIO',recurso:'A-5',detalle:'',id:'largo-'+i}));
  const respuestasLargas=await evalBrowser('enviarLote(largos)');
  assert.equal(respuestasLargas.length,8);
  assert.ok(llamadasLargas>=2,'Códigos largos deben dividirse para acortar la URL');
  browser.jsonpSeguro=jsonpAntes;
  console.log(`OK: DESCARGUIO con dos paradas, 8 registros por lote, URL corta, INVENTARIO extrae PPO y cinco dígitos, rechaza lecturas inválidas, normaliza pendientes, corrige histórico con respaldo, actualización remota y reenvío idempotente; lote compacto ${compacto.length}/${previo.length} caracteres`);
}
run().catch(e=>{console.error(e);process.exitCode=1});

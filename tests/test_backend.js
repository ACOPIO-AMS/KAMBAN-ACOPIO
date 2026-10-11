const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../INGRESO_DE_DATOS_KANBAN_0002_9_12.gs','utf8');
const context={console,Date,Math}; vm.createContext(context); vm.runInContext(src,context);
assert.equal(context.kaDuracionTexto(600),10);
assert.equal(context.kaDuracionTexto(1),0.02);
assert.equal(context.kaDuracionTexto(null),'');
const campos=(codigo,evento,fecha)=>({fila:0,valores:[codigo,evento,fecha,'OPERADOR','CHANCADO','C1','id','', '', '', '', '']});
const eventos=[campos('22525','RECEPCION','2026-10-11 07:00:00'), campos('22525','INICIO','2026-10-11 07:05:00'), campos('22525','PARADA','2026-10-11 07:08:00'),campos('22525','REINICIO','2026-10-11 07:10:00'),campos('22525','FINAL','2026-10-11 07:15:00')];
eventos.forEach((v,i)=>v.fila=i+2);
const a=context.kaCalcularFilasTiempos(eventos,'CHANCADO');
assert.equal(a.length,1);assert.equal(JSON.stringify(a[0].valores),JSON.stringify([5,2,8,15]));
let inv=context.kaNormalizarRegistro({codigo:'PPO22525',evento:'LECTURA',fecha_hora:'2026-10-11 11:00:00',operador:'TEST',estacion:'INVENTARIO',recurso:'0 A',id:'id-123'});
assert.equal(inv.codigo,'PPO22525');assert.equal(inv.recurso,'0 A');
for(const recurso of ['3 A','10 10','0 4','A-5','B 0']){const v=context.kaNormalizarRegistro({codigo:'PPO22525',evento:'LECTURA',fecha_hora:'2026-10-11 11:00:00',operador:'TEST',estacion:'INVENTARIO',recurso,id:'id-123'});assert(/^(?:0|[1-9]|10) (?:A|B|C|[4-9]|10)$/.test(v.recurso));}
assert.equal(context.kaNormalizarUbicacionInventario_('A-5'),'5 A');
console.log('OK backend: duraciones en minutos, paradas, inventario y validación.');

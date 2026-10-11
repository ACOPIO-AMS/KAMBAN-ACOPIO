const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync(__dirname+'/../js/exportar_excel.js','utf8');
const ctx={TextEncoder,Blob,console,URL,Date,setTimeout:(fn)=>{fn();return 0;},clearTimeout,alert:msg=>{throw new Error(msg)}};
ctx.window=ctx;ctx.document={createElement:()=>({click(){},remove(){},style:{}}),body:{appendChild(){}}};
ctx.URL={createObjectURL:()=> 'blob:test', revokeObjectURL:()=>{}};
ctx.datos=()=>[
 {codigo:'01234',evento:'INICIO',fecha_hora:'2026-10-11 11:00:00',estacion:'CHANCADO',recurso:'C1',sincronizado:false,id:'ABC-1',extra:'<&sí'},
 {codigo:'22525',evento:'LECTURA',estacion:'INVENTARIO',recurso:'A-5',sincronizado:true,id:'ABC-2',lectura_original:'PPO22525'}
];
vm.createContext(ctx);vm.runInContext(code,ctx);
(async()=>{const blob=ctx.exportarExcel();if(!blob)throw Error('no blob');fs.writeFileSync(__dirname+'/test_respaldo.xlsx',Buffer.from(await blob.arrayBuffer()));console.log('xlsx bytes',blob.size)})();

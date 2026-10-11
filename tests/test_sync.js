const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/lote_2_9_11.js','utf8');
const p=[{id:'A',codigo:'00001',recurso:'C1'},{id:'B',codigo:'00002',recurso:'C1'}];
async function run(mockResponse,expected,extra={}){
 let single=[];let requests=[];
 let ctx={syncBackendSoloIndividual:false, SYNC_REQUEST_TIMEOUT_MS:2000,
   codificarLote:()=> 'abc',
   jsonpSeguro:async x=>{requests.push(x);return typeof mockResponse==='function'?mockResponse(x):mockResponse},
   enviarYConfirmar:async x=>{single.push(x.id);return x}, ...extra};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 let r=await ctx.enviarLote(p);
 assert.equal(JSON.stringify(r.map(x=>[x.id,x.ok])),JSON.stringify(expected));
 return {single,requests,mode:ctx.syncBackendSoloIndividual};
}
(async()=>{
 let a=await run({ok:true,data:[{ok:true,id:'A',recurso:'C1'},{ok:true,id:'B',recurso:'C1'}]},[['A',true],['B',true]]);
 assert.deepEqual(a.single,[]);
 let b=await run({ok:true,data:[{ok:true,id:'A',recurso:'C1'}]},[['A',true],['B',true]]);assert.deepEqual(b.single,['B']);
 let c=await run({ok:true,data:undefined},[['A',true],['B',true]]);assert.equal(c.mode,true);
 let d=await run({ok:false,error:'Acción no reconocida: save_batch'},[['A',true],['B',true]]);assert.equal(d.mode,true);
 let busy=false;try{await run({ok:false,error:'Base ocupada'},[])}catch(e){busy=/ocupada/i.test(e.message)}assert.ok(busy);
 console.log('OK sync: lote completo, parcial, sin IDs, batch incompatible y base ocupada.');
})().catch(e=>{console.error(e);process.exit(1)});

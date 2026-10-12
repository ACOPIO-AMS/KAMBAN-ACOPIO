function $(id){return document.getElementById(id)}
function fechaHoraLocal(d=new Date()){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+":"+String(d.getSeconds()).padStart(2,"0")}
function horaCorta(f){return String(f||"").substring(11,16)}
function uid(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10)}
function endpoint(){return String(ENDPOINT_FIJO||"").trim()}
function textoTabla(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function setEstado(t){const e=$("estadoEntrada");if(e)e.textContent=t||""}
function beepOk(){try{navigator.vibrate&&navigator.vibrate(35)}catch(e){}}
function extraerCodigoInventario(lectura){
 const texto=String(lectura||"").trim().toUpperCase();
 if(/^\d{5}$/.test(texto))return "PPO "+texto;
 const codigos=[...texto.matchAll(/PP[O0]\s*(\d{5})(?!\d)/g)].map(x=>"PPO "+x[1]);
 const unicos=[...new Set(codigos)]; return unicos.length===1?unicos[0]:"";
}
function normalizarUbicacion(v){
 const t=String(v||"").trim().toUpperCase();
 const viejo=t.match(/^(A|B|C|[4-9]|10)[ -](0|[1-9]|10)$/);
 return viejo?`${viejo[2]} ${viejo[1]}`:t.replace(/-/g," ").replace(/\s+/g," ");
}
function esUbicacionValida(v){return /^(?:0|[1-9]|10) (?:A|B|C|[4-9]|10)$/.test(normalizarUbicacion(v))}

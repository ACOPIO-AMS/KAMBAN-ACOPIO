function $(id){return document.getElementById(id)}
function fechaHoraLocal(d=new Date()){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+":"+String(d.getSeconds()).padStart(2,"0")}
function horaCorta(f){return String(f||"").substring(11,16)}
function uid(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10)}
function endpoint(){return String(ENDPOINT_FIJO||"").trim()}
function textoTabla(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function setEstado(t){const e=$("estadoEntrada");if(e)e.textContent=t||""}
function beepOk(){try{navigator.vibrate&&navigator.vibrate(35)}catch(e){}}
function extraerCodigoInventario(lectura){
 // Procesar exclusivamente la primera línea; nunca leer los campos posteriores.
 const primeraLinea=String(lectura??"").split(/\r\n|\n|\r/)[0].trim().toUpperCase();
 if(!primeraLinea)return "";
 // Formato Lote: PPO-70319 / LoteÑ PPO'70320 (incluye caracteres alterados del QR).
 let m=primeraLinea.match(/^LOTE\s*[^A-Z0-9\r\n]*\s*(?:PPO|PP0)\s*[^A-Z0-9\r\n]*\s*([0-9]{5})(?![0-9])/);
 if(m)return "PPO "+m[1];
 // Formato antiguo: fecha | hora | PPO 69767 | otros datos.
 m=primeraLinea.match(/(?:^|[|\]\[;])\s*(?:PPO|PP0)\s*[-'’\s]*([0-9]{5})(?![0-9])(?=\s*(?:$|[|\]\[;]))/);
 if(m)return "PPO "+m[1];
 // Lecturas simples anteriores.
 m=primeraLinea.match(/^(?:(?:PPO|PP0)\s*[-'’:]?\s*)?([0-9]{5})$/);
 return m?"PPO "+m[1]:"";
}
function normalizarUbicacion(v){
 const t=String(v||"").trim().toUpperCase();
 const viejo=t.match(/^(A|B|C|[4-9]|10)[ -](0|[1-9]|10)$/);
 return viejo?`${viejo[2]} ${viejo[1]}`:t.replace(/-/g," ").replace(/\s+/g," ");
}
function esUbicacionValida(v){return v==="POR ENTREGAR"||/^(?:0|[1-9]|10) (?:A|B|C|[4-9]|10)$/.test(normalizarUbicacion(v))}

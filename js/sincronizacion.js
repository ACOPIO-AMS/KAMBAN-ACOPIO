let sincronizando=false;

async function sincronizar(manual=false){
  if(sincronizando) return;
  const url=endpoint();
  if(!url || !navigator.onLine){ if(manual) alert("Sin conexión o falta URL."); return; }
  const pend=datos().filter(r=>!r.sincronizado);
  if(!pend.length){ if(manual) alert("No hay pendientes."); render(); return; }
  sincronizando=true;
  let enviados=0;
  for(const r of pend){
    try{
      await fetch(url,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});
      actualizarRegistro(r.id,{sincronizado:true});
      enviados++;
    }catch(e){ break; }
  }
  if(enviados) localStorage.setItem(LAST_SYNC_KEY,fechaHoraLocal());
  sincronizando=false;
  render();
  if(manual) alert("Sincronizados: "+enviados);
}

function cargarDrive(callback){
  const cb="kamban_cb_"+Date.now();
  const s=document.createElement("script");
  window[cb]=resp=>{
    window.datosRemotos = Array.isArray(resp)?resp:(resp && resp.data?resp.data:[]);
    delete window[cb]; s.remove(); callback && callback();
  };
  s.onerror=()=>{ window.datosRemotos=null; delete window[cb]; s.remove(); callback && callback(); };
  s.src=endpoint()+"?action=list&callback="+cb+"&_="+Date.now();
  document.body.appendChild(s);
}

window.addEventListener("online",()=>sincronizar(false));

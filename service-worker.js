const CACHE_NAME="kamban-acopio-v2-000-cr";
const APP_FILES=["./","./index.html","./manifest.json","./css/estilos.css","./js/config.js","./js/utilidades.js","./js/db.js","./js/reglas.js","./js/sincronizacion.js","./js/seguimiento.js","./js/admin.js","./js/app.js","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_FILES)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;if(e.request.url.includes("script.google.com")||e.request.url.includes("script.googleusercontent.com"))return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,cp));return r;}).catch(()=>caches.match("./index.html"))));});

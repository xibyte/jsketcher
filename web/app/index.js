
localStorage.clear();
sessionStorage.clear();

if ('caches' in window) {
  caches.keys().then(names => names.forEach(name => caches.delete(name)));
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

import startApplication from "./cad/init/startApplication";

startApplication(context => {
  window.__CAD_APP = context;
});

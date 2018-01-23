
export function activate({services}) {

  function set(key, value) {
    localStorage.setItem(key, value);
  }

  function get(key) {
    return localStorage.getItem(key);
  }

  function addListener(handler) {
    window.addEventListener('storage', handler, false);
  }

  services.storage = {
    set, get, addListener
  }
}

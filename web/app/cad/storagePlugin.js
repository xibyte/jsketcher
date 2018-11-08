
export function activate({services}) {

  function set(key, value) {
    localStorage.setItem(key, value);
  }

  function get(key) {
    return localStorage.getItem(key);
  }

  function remove(key) {
    return localStorage.removeItem(key);
  }

  function getAllKeysFromNamespace(namespace) {
    let keys = [];
    for(let i = localStorage.length - 1; i >= 0 ; i--) {
      const key = localStorage.key(i);
      if (key.startsWith(namespace)) {
        keys.push(key);
      }
    }
    return keys;
  }

  function addListener(handler) {
    window.addEventListener('storage', handler, false);
  }

  services.storage = {
    set, get, remove, addListener, getAllKeysFromNamespace
  }
}

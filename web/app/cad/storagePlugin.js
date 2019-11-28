import {stream} from '../../../modules/lstream';

export function defineStreams(ctx) {
  ctx.streams.storage = {
    update: stream()
  }
}

export function activate({services, streams}) {

  function set(key, value, quiet) {
    localStorage.setItem(key, value);
    if (!quiet) {
      notify(key);
    }
  }

  function get(key) {
    return localStorage.getItem(key);
  }

  function remove(key) {
    try {
      return localStorage.removeItem(key);  
    } finally {
      notify(key);
    }
  }

  function exists(key) {
    return localStorage.hasOwnProperty(key);
  }
  
  function notify(key) {
    streams.storage.update.next({
      key,
      timestamp: Date.now
    });
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

  window.addEventListener('storage', evt => notify(evt.key), false);
  
  const addListener = listener => streams.storage.update.attach(listener);

  services.storage = {
    set, get, remove, addListener, getAllKeysFromNamespace, exists
  }
}

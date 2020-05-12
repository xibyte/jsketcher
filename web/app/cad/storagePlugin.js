import {stream} from '../../../modules/lstream';

const updates$ = stream();

export function defineStreams(ctx) {
  ctx.streams.storage = {
    update: updates$.throttle(100)
  }
}

export function activate({services, streams}) {

  function set(key, value) {
    console.log("Saving: " + key);
    localStorage.setItem(key, value);
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
    updates$.next({
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

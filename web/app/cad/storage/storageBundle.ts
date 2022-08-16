import {stream} from 'lstream';
import {ApplicationContext} from "cad/context";

const updates$ = stream();

export function defineStreams(ctx) {
  ctx.streams.storage = {
    update: updates$.throttle(100)
  }
}

export function activate(ctx: ApplicationContext) {

  const {services, streams} = ctx;

  function set(key, value) {
    console.log("Saving: " + key);
    localStorage.setItem(key, value);
    notify(key);
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
    return key in localStorage;
  }
  
  function notify(key) {
    updates$.next({
      key,
      timestamp: Date.now
    });
  }

  function getAllKeysFromNamespace(namespace) {
    const keys = [];
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

  ctx.storageService = {
    set, get, remove, addListener, getAllKeysFromNamespace, exists
  };

  services.storage = ctx.storageService;

}


export interface StorageService {

  set(path: string, content: string): void;

  get(path: string): string;

  remove(path: string): void;

  getAllKeysFromNamespace(path: string): string[];

  exists(path: string): boolean;

  addListener(callback: (StorageUpdateEvent) => void);

}

export interface StorageBundleContext {

  storageService: StorageService;
}

export const BundleName = "@Storage";
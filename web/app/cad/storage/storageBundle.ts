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
  // An embedded desktop window must not share CAD projects with another
  // window or account at the same origin. This is a volatile workspace only;
  // the host still needs an explicit, authorized My files bridge.
  const volatile = new URLSearchParams(window.location.search).get('webos') === '1';
  const workspace = new Map<string, string>();

  function set(key, value) {
    console.log("Saving: " + key);
    if (volatile) workspace.set(key, value); else localStorage.setItem(key, value);
    notify(key);
  }

  function get(key) {
    return volatile ? (workspace.get(key) ?? null) : localStorage.getItem(key);
  }

  function remove(key) {
    try {
      if (volatile) workspace.delete(key); else localStorage.removeItem(key);
    } finally {
      notify(key);
    }
  }

  function exists(key) {
    return volatile ? workspace.has(key) : key in localStorage;
  }
  
  function notify(key) {
    updates$.next({
      key,
      timestamp: Date.now
    });
  }

  function getAllKeysFromNamespace(namespace) {
    if (volatile) return Array.from(workspace.keys()).filter(key => key.startsWith(namespace));
    const keys = [];
    for(let i = localStorage.length - 1; i >= 0 ; i--) {
      const key = localStorage.key(i);
      if (key.startsWith(namespace)) {
        keys.push(key);
      }
    }
    return keys;
  }

  if (!volatile) window.addEventListener('storage', evt => { if (evt.key !== null) notify(evt.key); }, false);
  
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

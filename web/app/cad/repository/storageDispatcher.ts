

import {Storage, StorageUpdateEvent} from "./storage";
import {stream} from "lstream";


export class StorageDispatcher implements Storage {

  readonly storageMap: {string: Storage};
  readonly defaultStorage: Storage;
  readonly updates$ = stream();
  readonly throttledInterface$ = this.updates$.throttle(100);

  constructor(storageMap, defaultStorage) {
    this.storageMap = storageMap;
    this.defaultStorage = defaultStorage;
    Object.entries(this.storageMap).forEach(([storageId, storage]) => {

      storage.attach(e => {
        this.updates$.next({...e, path: storageId + ':' + e.path});
      });
    });
  }

  classifyStorage(path: string): [Storage, string] {

    const splitter = path.indexOf(':');
    if (splitter === -1) {
      return [this.defaultStorage, path];
    }
    const storageId = path.substring(0, splitter);
    const subPath = path.substring(splitter + 1);
    const storage = this.storageMap[storageId];
    if (!storage) {
      throw new Error('unknown storage reference: ' + storageId);
    }
    return [storage, subPath];
  }

  get(path: string): Promise<string> {
    try {
      const [storage, subPath] = this.classifyStorage(path);
      return storage.get(subPath);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  set(path: string, content: string): Promise<void> {
    try {
      const [storage, subPath] = this.classifyStorage(path);
       storage.set(subPath, content);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  exists(path: string): Promise<boolean> {
    try {
      const [storage, subPath] = this.classifyStorage(path);
      return storage.exists(subPath);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  list(path: string): Promise<string[]> {
    try {
      const [storage, subPath] = this.classifyStorage(path);
      return storage.list(subPath);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  remove(path: string): Promise<void> {
    try {
      const [storage, subPath] = this.classifyStorage(path);
      storage.remove(subPath);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  attach(callback: (value: StorageUpdateEvent) => any): () => void {
    return this.throttledInterface$.attach(callback);
  }

}


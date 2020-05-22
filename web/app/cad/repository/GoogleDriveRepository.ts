import {Repository, StorageUpdateEvent} from "./repository";
import {stream} from "lstream";


export class GoogleDriveRepository implements Repository {

  readonly prefix: string;

  private readonly updates$ = stream();
  private readonly notify: (key) => void;

  constructor(prefix) {
    this.prefix = prefix;
    this.notify = (path) => {
      this.updates$.next({
        path,
        timestamp: Date.now
      });
    };
    window.addEventListener('storage', evt => this.notify(evt.key.substring(prefix.length)), false);
  }

  get(path: string): Promise<string> {
    try {
      return Promise.resolve(localStorage.getItem(this.prefix + path));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  set(path: string, content: string): Promise<void> {
    try {
      localStorage.setItem(this.prefix + path, content);
      this.notify(path);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  exists(path: string): Promise<boolean> {
    try {
      return Promise.resolve(localStorage.hasOwnProperty(this.prefix + path));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  list(path: string): Promise<string[]> {
    const namespace = this.prefix + path;
    try {
      let keys = [];
      for(let i = localStorage.length - 1; i >= 0 ; i--) {
        const key = localStorage.key(i);
        if (key.startsWith(namespace)) {
          keys.push(key);
        }
      }
      return Promise.resolve(keys);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  remove(path: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + path);
      this.notify(path);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  attach(callback: (value: StorageUpdateEvent) => any): () => void {
    return this.updates$.attach(callback);
  }

}


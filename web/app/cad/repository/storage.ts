import {Observable} from "lstream";

export interface StorageUpdateEvent {
  path: string;
  timestamp: number
}

export interface Storage extends Observable<StorageUpdateEvent> {

  set(path: string, content: string): Promise<void>;

  get(path: string): Promise<string>;

  remove(path: string): Promise<void>;

  list(path: string): Promise<string[]>;

  exists(path: string): Promise<boolean>;

}
import {Observable} from "lstream";

export interface StorageUpdateEvent {
  path: string;
  timestamp: number
}

export interface Repository extends Observable<StorageUpdateEvent> {

  set(path: string, content: string): Promise<void>;

  get(path: string): Promise<Response>;

  remove(path: string): Promise<void>;

  list(path: string): Promise<{
    name: string,
    path: string,
    type: string}[]>;

  exists(path: string): Promise<boolean>;

}
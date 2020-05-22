import {Repository, StorageUpdateEvent} from "./repository";
import {stream} from "lstream";
import {createHttpError} from "network/createHttpError";
import {checkHttpResponseStatus} from "network/checkHttpResponseStatus";


export class GitHubRepoRepository implements Repository {

  readonly repo: string;
  readonly branch: string;

  private readonly updates$ = stream();
  private readonly notify: (key) => void;

  constructor(repo, branch) {
    this.repo = repo;
    this.branch = branch;
  }

  url(path) {
    return `https://api.github.com/repos/${this.repo}/contents${path}?ref=${this.branch}`
  }


  get(path: string): Promise<Response> {
    return fetch(this.url(path))
      .then(checkHttpResponseStatus)
      .then(res => res.json())
      .then(res => fetch(res.download_url))
      .then(checkHttpResponseStatus);
  }

  set(path: string, content: string): Promise<void> {
    return Promise.reject(new Error("write to github is not supported"));
  }

  exists(path: string): Promise<boolean> {
    return fetch(this.url(path), {method: 'HEAD'})
      .then(res => {
        if (res.status === 404) {
          return false;
        } else if (res.status < 400) {
          return true;
        } else {
          throw createHttpError(res);
        }
      });
  }

  list(path: string){
    return fetch(this.url(path))
      .then(checkHttpResponseStatus)
      .then(res => res.json())
      .then(res => {
        return res.map(f => ({
          name: f.name as string,
          path: f.path as string,
          type: f.type as string
        }));
      });

  }

  remove(path: string): Promise<void> {
    return Promise.reject(new Error("write to github is not supported"));
  }

  attach(callback: (value: StorageUpdateEvent) => any): () => void {
    throw new Error("Listening GitHub is not supported");
  }

}


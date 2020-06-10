import {Repository} from "../repository/repository";

export class PartRepository {

  readonly id: string;
  readonly repo: Repository;
  readonly partsPath: string;

  constructor(id: string, repo: Repository, partsPath: string) {
    this.id = id;
    this.repo = repo;
    this.partsPath = partsPath;
  }

  readPartResource = (partId: string, resourceName: string) => {
    return this.repo.get(this.partsPath + '/' + partId + '/' + partId + '.' + resourceName);
  }

}

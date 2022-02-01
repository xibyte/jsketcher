import {MObject} from './mobject';
import {MShell} from "./mshell";
import {EntityKind} from "cad/model/entities";

export class MVertex extends MObject {

  static TYPE = EntityKind.VERTEX;
  shell: MShell;
  brepVertex: any;
  
  constructor(id, shell, brepVertex) {
    super(MVertex.TYPE, id);
    this.shell = shell;
    this.brepVertex = brepVertex;
  }

  get parent() {
    return this.shell;
  }

}
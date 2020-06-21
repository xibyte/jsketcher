import {MObject} from './mobject';
import {MShell} from "./mshell";

export class MVertex extends MObject {

  static TYPE = 'vertex';
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
import {MObject} from './mobject';

export class MVertex extends MObject {

  static TYPE = 'vertex';
  
  constructor(id, shell, brepVertex) {
    super();
    this.id = id;
    this.shell = shell;
    this.brepVertex = brepVertex;
  }

}
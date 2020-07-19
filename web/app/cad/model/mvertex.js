import {MObject} from './mobject';

export class MVertex extends MObject {

  static TYPE = 'vertex';
  
  constructor(id, shell, brepVertex) {
    super(MVertex.TYPE, id);
    this.shell = shell;
    this.brepVertex = brepVertex;
  }

}
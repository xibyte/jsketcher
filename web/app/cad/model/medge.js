import {MObject} from './mobject';

export class MEdge extends MObject {

  static TYPE = 'edge';

  constructor(id, shell, brepEdge) {
    super();
    this.id = id;
    this.shell = shell;
    this.brepEdge = brepEdge;
  }

}
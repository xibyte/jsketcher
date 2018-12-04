import {MObject} from './mobject';

export class MEdge extends MObject {

  static TYPE = 'edge';

  constructor(id, shell, brepEdge) {
    super(MEdge.TYPE, id);
    this.shell = shell;
    this.brepEdge = brepEdge;
  }

  get adjacentFaces() {
    let out = [];
    let face = this.shell.brepRegistry.get(this.brepEdge.halfEdge1 && this.brepEdge.halfEdge1.loop.face);
    if (face) {
      out.push(face);
    }
    face = this.shell.brepRegistry.get(this.brepEdge.halfEdge2 && this.brepEdge.halfEdge2.loop.face);
    if (face) {
      out.push(face);
    }
    return out;
  }
  
}
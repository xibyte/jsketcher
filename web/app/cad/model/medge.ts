import {MObject} from './mobject';
import {MBrepShell} from "./mshell";

export class MEdge extends MObject {

  static TYPE = 'edge';
  shell: MBrepShell;
  brepEdge: any;

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

  get favorablePoint() {
    return this.brepEdge.curve.middlePoint();
  }

  get parent() {
    return this.shell;
  }
}
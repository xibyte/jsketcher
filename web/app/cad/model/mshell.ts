import {MObject, MObjectIdGenerator} from './mobject';
import {MBrepFace} from './mface';
import {MEdge} from './medge';
import {MVertex} from './mvertex';
import CSys from 'math/csys';
import {Matrix3} from "math/l3space";
import {state, StateStream} from "lstream";

export class MShell extends MObject {

  static TYPE = 'shell';

  csys: CSys;

  shell;
  faces = []; 
  edges = [];
  vertices = [];

  location$: StateStream<Matrix3> = state(new Matrix3());

  constructor() {
    super(MShell.TYPE, MObjectIdGenerator.next(MShell.TYPE, 'S'));
  }

  traverse(callback: (obj: MObject) => void): void {
    callback(this);
    this.faces.forEach(i => i.traverse(callback));
    this.edges.forEach(i => i.traverse(callback));
    this.vertices.forEach(i => i.traverse(callback));
  }

  get parent() {
    return null;
  }

  get location() {
    return this.location$.value;
  }
}

export class MBrepShell extends MShell {

  brepShell: any;
  csys: CSys;
  brepRegistry: Map<string, MObject>;

  constructor(shell, csys) {
    super();
    this.brepShell = shell;
    this.csys = csys || CSys.ORIGIN;
    this.brepRegistry = new Map();
    
    let faceCounter = 0;
    let edgeCounter = 0;
    let vertexCounter = 0;

    for (let brepFace of this.brepShell.faces) {
      const mFace = new MBrepFace(brepFace.data.id || (this.id + '/F:' + faceCounter++), this, brepFace);
      this.faces.push(mFace);
      this.brepRegistry.set(brepFace, mFace);
    }

    for (let brepEdge of this.brepShell.edges) {
      const mEdge = new MEdge(this.id + '/E:' + edgeCounter++, this, brepEdge);
      this.edges.push(mEdge);
      this.brepRegistry.set(brepEdge, mEdge);
    }

    for (let brepVertex of this.brepShell.vertices) {
      const mVertex = new MVertex(this.id + '/V:' + vertexCounter++, this, brepVertex);
      this.vertices.push(mVertex);
      this.brepRegistry.set(brepVertex, mVertex);
    }
  }

}

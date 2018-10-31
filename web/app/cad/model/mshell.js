import {MObject} from './mobject';
import {MBrepFace, MFace} from './mface';
import {MEdge} from './medge';
import {MVertex} from './mvertex';
import CSys from '../../math/csys';

export class MShell extends MObject {

  static TYPE = 'shell';

  static ID_COUNTER = 0;

  id = 'S:' + (MShell.ID_COUNTER++);
  shell;
  faces = [];
  edges = [];
  vertices = [];
}

export class MBrepShell extends MShell {

  constructor(shell, csys) {
    super();
    this.brepShell = shell;
    this.csys = csys || CSys.ORIGIN;
    
    let faceCounter = 0;
    let edgeCounter = 0;
    let vertexCounter = 0;

    for (let brepFace of this.brepShell.faces) {
      const mFace = new MBrepFace(brepFace.data.id || (this.id + '/F:' + faceCounter++), this, brepFace);
      this.faces.push(mFace);
    }

    for (let brepEdge of this.brepShell.edges) {
      const mEdge = new MEdge(this.id + '/E:' + edgeCounter++, this, brepEdge);
      this.edges.push(mEdge);
    }

    for (let brepVertex of this.brepShell.vertices) {
      const mVertex = new MVertex(this.id + '/V:' + vertexCounter++, this, brepVertex);
      this.vertices.push(mVertex);
    }
  }
}

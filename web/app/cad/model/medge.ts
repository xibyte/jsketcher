import {MObject} from './mobject';
import {MBrepShell} from "./mshell";
import {EntityKind} from "cad/model/entities";
import {Edge} from "brep/topo/edge";
import {UnitVector} from "math/vector";
import {TopoObject} from "brep/topo/topo-object";
import Axis from "math/axis";

export class MEdge extends MObject {

  static TYPE = EntityKind.EDGE;
  shell: MBrepShell;
  brepEdge: Edge;

  constructor(id, shell, brepEdge) {
    super(MEdge.TYPE, id);
    this.shell = shell;
    this.brepEdge = brepEdge;
  }

  get adjacentFaces() {
    const out = [];
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

  toDirection(): UnitVector {
    return this.brepEdge.halfEdge1.tangentAtStart();
  }

  toAxis(reverse: boolean = false): Axis {
    let tan;
    let origin;
    const he = this.brepEdge.halfEdge1;
    if (reverse) {
      tan = he.tangentAtStart();
      origin = he.vertexA.point;
    } else {
      tan = he.tangentAtEnd().negate();
      origin = he.vertexB.point;
    }
    return new Axis(origin, tan);
  }

  get topology(): TopoObject {
    return this.brepEdge;
  }

}
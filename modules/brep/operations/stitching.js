import {DoubleKeyMap} from '../../../web/app/utils/utils'

export const FACE_CHUNK = 'stitching.face.chunk';
export const EDGE_CHUNK = 'stitching.edge.chunk';
export const EDGE_AUX = 'stitching.edge.aux';

export class StitchedSurface {
  constructor() {
    this.faces = [];   
    this.origin = null;
  }
  
  addFace(face) {
    face.data[FACE_CHUNK] = this;
    this.faces.push(face);
  }
  
  clear() {
    this.faces = [];
  }
  
}

export class StitchedCurve {
  constructor(surface1, surface2) {
    this.surface1 = surface1;
    this.surface2 = surface2;
    this.edges = [];
  }

  addEdge(edge) {
    this.edges.push(edge);
    edge.data[EDGE_CHUNK] = this;
  }
  
  equals(other) {
    return other instanceof StitchedCurve &&
        
      ((this.surface1 == other.surface1 &&
        this.surface2 == other.surface2) ||
          
       (this.surface1 == other.surface2 &&
        this.surface2 == other.surface1)
      )
  }
}

export function update(shell) {
  const index = new DoubleKeyMap();
  for (let face of shell.faces) {
    const stitchedSurface = face.data[FACE_CHUNK];
    if (stitchedSurface) {
      stitchedSurface.clear();
    }
  }
  for (let face of shell.faces) {
    const stitchedSurface = face.data[FACE_CHUNK];
    if (stitchedSurface) {
      stitchedSurface.addFace(face);
    }
  }
  for (let e of shell.edges) {
    const face1 = e.halfEdge1.loop.face;
    const face2 = e.halfEdge2.loop.face;
    const stitchedSurface1 = face1.data[FACE_CHUNK];
    const stitchedSurface2 = face2.data[FACE_CHUNK];
    if (stitchedSurface1 !== undefined && stitchedSurface1 === stitchedSurface2) {
      e.data[EDGE_AUX] = stitchedSurface1;
    } else if (stitchedSurface1 !== undefined || stitchedSurface2 !== undefined ) {
      const o1 = stitchedSurface1 !== undefined ? stitchedSurface1 : face1.surface;
      const o2 = stitchedSurface2 !== undefined ? stitchedSurface2 : face2.surface;
      const stitchedCurve = getCurve(index, o1, o2);
      stitchedCurve.addEdge(e);
    } 
  }
}

export function getCurve(index, o1, o2) {
  let curve = index.get(o1, o2);
  if (curve == null) {
    curve = new StitchedCurve(o1, o2);
    index.set(o1, o2, curve);
  }
  return curve;
}


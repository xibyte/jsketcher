const FACE_CHUNK = 'approx.face.chunk';
const EDGE_CHUNK = 'approx.edge.chunk';
const EDGE_AUX = 'approx.edge.aux';

class ApproxSurface {
  constructor() {
    this.faces = [];   
  }
  
  addFace(face) {
    face.data[FACE_CHUNK] = this;
    this.faces.push(face);
  }
}

class ApproxCurve {
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
    return other instanceof ApproxCurve &&
        
      ((this.surface1 == other.surface1 &&
        this.surface2 == other.surface2) ||
          
       (this.surface1 == other.surface2 &&
        this.surface2 == other.surface1)
      )
  }
}

function update(shell) {
  const index = new DoubleKeyMap();
  for (let e of shell.edges) {
    const face1 = e.halfEdge1.loop.face;
    const face2 = e.halfEdge2.loop.face;
    const approxSurface1 = face1.data[FACE_CHUNK];
    const approxSurface2 = face2.data[FACE_CHUNK];
    if (approxSurface1 !== undefined && approxSurface1 === approxSurface2) {
      e.data[EDGE_AUX] = approxSurface1;
    } else if (approxSurface1 !== undefined || approxSurface2 !== undefined ) {
      const o1 = approxSurface1 !== undefined ? approxSurface1 : face1.surface;
      const o2 = approxSurface2 !== undefined ? approxSurface2 : face2.surface;
      const approxCurve = getCurve(index, o1, o2);
      approxCurve.addEdge(e);
    } 
  }
}

function getCurve(index, o1, o2) {
  let curve = index.get(o1, o2);
  if (curve == null) {
    curve = new ApproxCurve(o1, o2);
    index.set(o1, o2, curve);
  }
  return curve;
}


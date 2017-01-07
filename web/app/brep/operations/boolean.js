import * as BREPBuilder from '../brep-builder';
import {HalfEdge} from '../topo/edge';
import {Loop} from '../topo/loop';
import {Face} from '../topo/face';
import {Shell} from '../topo/shell';

export function union( shell1, shell2 ) {
  
  const faces = shell1.faces.concat(shell2.faces);
  
  const solveData = intersectFaces(shell1, shell2);

  const result = new Shell();
  
  for (let faceData of solveData.shell1.faceData) {
    
    const seen = new Set();

    //intersection edges must go first
    faceData.edges.sort((a, b) => {
      const aX = solveData.newEdges.has(a);
      const bX = solveData.newEdges.has(b);
      return aX ? (bX ? 0 : -1) : 1;
    });
    
    while (true) {
      let edge = faceData.edges.pop();
      if (edge == undefined || seen.has(edge)) {
        break;
      }
      const loop = new Loop();
      while (edge) {
        loop.halfEdges.push(edge);
        seen.add(edge);
        let candidates = this.vertexToEdge.get(edge.vertexB);
        edge = findMaxTurningLeft(candidates);
        if (seen.has(edge)) {
          break;
        }
      }

      BREPBuilder.linkSegments(loop.halfEdges);
      const newFace = new Face(faceData.face.surface);
      newFace.outerLoop = loop;
      newFace.outerLoop.face = newFace;
      result.push(newFace);
    }
  }
}


function intersectFaces(shell1, shell2) {
  const data = new SolveData();
  for (let i = 0; i < shell1.faces.length; i++) {
    for (var j = 0; j < shell2.faces.length; j++) {
      if (i == j) continue;
      
      const face1 = shell1.faces[i];
      const face2 = shell2.faces[j];
      const curve = face1.surface.intersect(face2.surface);

      const face1Segments = split(curve, face1.outerLoop);
      const face2Segments = split(curve, face2.outerLoop);
      const segments = merge(face1Segments, face2Segments);        
      
      
    }
    
  }
  
}

class SolveData {
  constructor() {
    this.shell1 = new ShellSolveData();
    this.shell2 = new ShellSolveData();
    this.newEdges = new Set();
  }
}

class ShellSolveData  {
  constructor() {
    this.faceData = [];
  }
}

class FaceSolveData {
  constructor(face) {
    this.face = face;
    this.edges = [];
    this.vertexToEdge = new Map();
  }
}

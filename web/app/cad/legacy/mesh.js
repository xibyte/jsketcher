import * as cad_utils from '../cad-utils'
import {HashTable} from '../../utils/hashmap'

export function MeshFace() {
  this.polygons = [];
}

export function MeshPolygon(id, normal, w, points) {
  this.id = id;
  this.normal = normal;
  this.w = w;
  this.points = points;
  this.neighbors = [];
}

export function Mesh(edges) {
  this.edges = edges;
  this.faces = [];
  this.getEdgeInfo = function(point1, point2) {
    return edges.get(arguments)
  }
}

Mesh.fromPolygons = function(polygons, smoothAngle) {
  const edges = HashTable.forEdge();
  
  let counter = 0;
  const allPolygons = [];
  function index(polygon) {
    if (polygon.length < 3) {
      console.warn('invalid polygon ' + polygon);
      return;
    }
    const normal = cad_utils.normalOfCCWSeq(polygon);
    const w = normal.dot(polygon[0]);

    const polygonInfo = new MeshPolygon(counter++, normal, w, polygon);
    
    allPolygons.push(polygonInfo);
    
    for (let p = polygon.length - 1, q = 0; q < polygon.length; p = q ++) {
      var edgeKey = [polygon[p], polygon[q]];
      let edgeInfo = edges.get(edgeKey);
      if (edgeInfo == null) {
        edges.put(edgeKey, [polygonInfo])
      } else {
        let other = edgeInfo[0];
        other.neighbors.push(polygonInfo);
        polygonInfo.neighbors.push(other);
        edgeInfo.push(polygonInfo);
      }
    }
  }

  const visited = {};
  function mergePolygons(tr, meshFace) {
    if (visited[tr.id]) {
      return;
    }
    visited[tr.id] = true;
    meshFace.polygons.push(tr);
    for (let nb of tr.neighbors) {
      if (Math.acos(nb.normal.dot(tr.normal)) < smoothAngle) {
        mergePolygons(nb, meshFace)
      }
    }
  }
  polygons.forEach(p => index(p));
  const mesh = new Mesh(edges);
  for (let tr of allPolygons) {
    const meshFace = new MeshFace();
    mergePolygons(tr, meshFace);
    if (meshFace.polygons.length != 0) {
      mesh.faces.push(meshFace);
    }
  }
  return mesh;
};


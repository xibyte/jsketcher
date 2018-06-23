import {View} from './view';
import * as vec from '../../../math/vec';
import {setAttribute} from '../../../../../modules/scene/objectData';
import {perpendicularVector} from '../../../math/math';
import * as SceneGraph from '../../../../../modules/scene/sceneGraph';
import {EDGE} from '../entites';

export class EdgeView extends View {
  
  constructor(edge) {
    super(edge);
    this.rootGroup = SceneGraph.createGroup();

    const doEdge = (edge, aux, width, color, opacity) => {
      const geometry = new THREE.Geometry();
      const scaleTargets = [];
      geometry.dynamic = true;
      let materialParams = {
        color,
        vertexColors: THREE.FaceColors,
        shininess: 0,
        visible: !aux,
        morphTargets: true
      };
      if (opacity !== undefined) {
        materialParams.transparent = true;
        materialParams.opacity = opacity;
      }
      let tess = edge.data.tesselation ? edge.data.tesselation : edge.curve.tessellateToData();
      let base = null;
      for (let i = 1; i < tess.length; i++) {

        let a  = tess[i - 1];
        let b  = tess[i];
        let ab = vec._normalize(vec.sub(b, a));

        let dirs = [];
        dirs[0] = perpendicularVector(ab);
        dirs[1] = vec.cross(ab, dirs[0]);
        dirs[2] = vec.negate(dirs[0]);
        dirs[3] = vec.negate(dirs[1]);

        dirs.forEach(d => vec._mul(d, width));
        if (base === null) {
          base = dirs.map(d => vec.add(a, d));
        }
        let lid = dirs.map(d => vec.add(b, d));

        let off = geometry.vertices.length;
        base.forEach(p => geometry.vertices.push(vThree(p)));
        lid.forEach(p => geometry.vertices.push(vThree(p)));

        function addScaleTargets(points, origin) {
          points.forEach(p => scaleTargets.push(vThree(vec._add(vec._mul(vec.sub(p, origin), 10), origin))));
        }
        addScaleTargets(base, a);
        addScaleTargets(lid, b);


        base = lid;

        [
          [0, 4, 3],
          [3, 4, 7],
          [2, 3, 7],
          [7, 6, 2],
          [0, 1, 5],
          [5, 4, 0],
          [1, 2, 6],
          [6, 5, 1],
        ].forEach(([a, b, c]) => geometry.faces.push(new THREE.Face3(a + off, b + off, c + off)));
      }
      geometry.morphTargets.push( { name: "scaleTargets", vertices: scaleTargets } );
      geometry.computeFaceNormals();

      let mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial(materialParams));
      this.rootGroup.add(mesh);

      // mesh.morphTargetInfluences[ 0 ] = 0.2;
      return mesh;
    };
    
    this.representation = doEdge(edge.brepEdge, false,  1, 0x2B3856);
    this.marker = doEdge(edge.brepEdge, true, 3, 0xFA8072, 0.8);

    setAttribute(this.representation, EDGE, this);
    setAttribute(this.marker, EDGE, this);
  }

  mark(color) {
    this.marker.material.visible = true;
  }

  withdraw(color) {
    this.marker.material.visible = false;
  }

  dispose() {
    this.representation.geometry.dispose();
    this.representation.material.dispose();

    this.marker.geometry.dispose();
    this.marker.material.dispose();

    super.dispose();
  }
}

const vThree = arr => new THREE.Vector3().fromArray(arr);

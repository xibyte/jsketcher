import {Wizard} from './wizard'
import {ReadSketchFromFace} from '../../sketch/sketch-reader'
import {Loop} from '../../../../brep/topo/loop'

export class PreviewWizard extends Wizard {

  constructor(app, opearation, metadata, initialState) {
    super(app, opearation, metadata, initialState);
    this.operation = opearation;
    this.previewGroup = new THREE.Object3D();
    this.previewObject = null;
    this.app.viewer.workGroup.add(this.previewGroup);
    this.updatePreview();
  }
  
  createPreviewObject() {throw 'abstract'};
  
  updatePreview() {
    this.destroyPreviewObject();
    this.previewObject = this.createPreviewObject(this.app, this.readFormFields());
    if (this.previewObject != null) {
      this.previewGroup.add( this.previewObject );
    }
    this.app.viewer.render();
  }

  destroyPreviewObject() {
    if (this.previewObject != null) {
      this.previewGroup.remove( this.previewObject );
      this.previewObject.geometry.dispose();
      this.previewObject = null;
    }
  }
  
  onUIChange() {
    super.onUIChange();
    this.updatePreview();
  }

  dispose() {
    this.destroyPreviewObject();
    this.app.viewer.workGroup.remove(this.previewGroup);
    this.app.viewer.render();
    super.dispose();
  }
}

PreviewWizard.createMesh = function(triangles) {
  const geometry = new THREE.Geometry();

  for (let tr of triangles) {
    const a = geometry.vertices.length;
    const b = a + 1;
    const c = a + 2;
    const face = new THREE.Face3(a, b, c);
    tr.forEach(v => geometry.vertices.push(v.three()));
    geometry.faces.push(face);
  }
  geometry.mergeVertices();
  geometry.computeFaceNormals();

  return new THREE.Mesh(geometry, IMAGINARY_SURFACE_MATERIAL);
};

export class SketchBasedPreviewer {

  constructor() {
    //this.fixToCCW = true;
  }
  
  createImpl(app, params, sketch, face) {
    throw 'not implemented';
  }
  
  create(app, params) {
    const face = app.findFace(params.face);
    if (!face) return null;
    const needSketchRead = !this.sketch || params.face != this.face;
    if (needSketchRead) {
      this.sketch = ReadSketchFromFace(app, face);
      //for (let polygon of this.sketch) {
        //if (!Loop.isPolygonCCWOnSurface(polygon, face.brepFace.surface) && this.fixToCCW) {
        //  polygon.reverse();
        //}
      //}
      this.face = params.face;
    }
    const triangles = this.createImpl(app, params, this.sketch.fetchContours(), face);
    return PreviewWizard.createMesh(triangles);
  }
}

export class SketchBasedNurbsPreviewer {

  constructor() {
  }

  createNurbses(app, params, sketch, face) {
    throw 'not implemented';
  }

  createMesh(app, params) {
    const face = app.findFace(params.face);
    if (!face) return null;
    const needSketchRead = !this.sketch || params.face != this.face;
    if (needSketchRead) {
      this.sketch = ReadSketchFromFace(app, face);
      this.face = params.face;
    }
    const nurbses = this.createNurbses(app, params, this.sketch, face);
    const geom = new THREE.Geometry();

    for (let nurbs of nurbses) {
      const off = geom.vertices.length;
      const tess = nurbs.tessellate({maxDepth: 3});
      const points = [];
      tess.points.forEach(p => geom.vertices.push(new THREE.Vector3().fromArray(p)));
      for (let faceIndices of tess.faces) {
        let normales = faceIndices.map(function(x) {
          var vn = tess.normals[x];
          return new THREE.Vector3( vn[0], vn[1], vn[2] );
        });
        const face = new THREE.Face3(faceIndices[0] + off, faceIndices[1] + off, faceIndices[2] + off, normales);
        geom.faces.push(face);
      }
    }
    return new THREE.Mesh(geom, IMAGINARY_SURFACE_MATERIAL);
  }
}

export const IMAGINARY_SURFACE_MATERIAL = new THREE.MeshPhongMaterial({
  vertexColors: THREE.FaceColors,
  color: 0xFA8072,
  transparent: true,
  opacity: 0.5,
  shininess: 0,
  depthWrite: false,
  depthTest: false,
  side : THREE.DoubleSide
});

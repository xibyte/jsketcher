import {brepFaceToGeom, tessDataToGeom} from './viewUtils';
import * as SceneGraph from 'scene/sceneGraph';
import {SketchObjectView} from './sketchObjectView';
import {View} from './view';
import {SketchLoopView} from './sketchLoopView';
import {createSolidMaterial} from "cad/scene/views/viewUtils";
import {SketchMesh} from "cad/scene/views/shellView";
import {FACE} from "cad/model/entities";
import {setAttribute} from "scene/objectData";
import {ViewMode} from "cad/scene/viewer";
import {WireframeGeometry, LineSegments, LineBasicMaterial, BufferGeometry, BufferAttribute, MeshBasicMaterial, DoubleSide} from "three";
import * as vec from 'math/vec';

export class SketchingView extends View {
  
  constructor(ctx, face, parent) {
    super(ctx, face, parent);
    this.sketchGroup = SceneGraph.createGroup();
    this.sketchObjectViews = [];
    this.sketchLoopViews = [];
    this.rootGroup = SceneGraph.createGroup();
    SceneGraph.addToGroup(this.rootGroup, this.sketchGroup);
    this.updateSketch();

    const stream = ctx.attributesService.streams.get(this.model.id);
    this.addDisposer(stream.attach(attr => {
      if (this.mesh) {
        this.setColor(attr.color);
        ctx.viewer.requestRender();
      }
    }));
  }

  updateSketch() {
    SceneGraph.emptyGroup(this.sketchGroup);
    this.disposeSketch();

    const sketchTr =  this.model.sketchToWorldTransformation;
    for (const sketchObject of this.model.sketchObjects) {
      const sov = new SketchObjectView(this.ctx, sketchObject, sketchTr);
      SceneGraph.addToGroup(this.sketchGroup, sov.rootGroup);
      this.sketchObjectViews.push(sov);
    }
    this.model.sketchLoops.forEach(mLoop => {
      const loopView = new SketchLoopView(this.ctx, mLoop);
      SceneGraph.addToGroup(this.sketchGroup, loopView.rootGroup);
      this.sketchLoopViews.push(loopView);  
    });
  }

  updateVisuals() {
    this.mesh.material.color.set(this.markColor||this.parent.markColor||this.color||this.parent.color||NULL_COLOR);
  }

  disposeSketch() {
    this.sketchObjectViews.forEach(o => o.dispose());
    this.sketchLoopViews.forEach(o => o.dispose());
    this.sketchObjectViews = [];
    this.sketchLoopViews = [];
  }

  dispose() {
    this.disposeSketch();
    super.dispose();
  }

}

export class FaceView extends SketchingView {
  
  constructor(ctx, face, parent, skin) {
    super(ctx, face, parent);
    let geom;

    const shellMesh = face.shell?.mesh;
    const faceIdx = face.shell?.faces?.indexOf(face);
    if (shellMesh && faceIdx !== undefined && faceIdx >= 0 && shellMesh.faceTriRanges[faceIdx]) {
      geom = buildFaceGeomFromShellMesh(shellMesh, faceIdx);
    } else if (face.brepFace?.data?.tessellation) {
      geom = tessDataToGeom(face.brepFace.data.tessellation.data);
    } else {
      geom = brepFaceToGeom(face.brepFace);
    }
    this.geometry = geom;
    this.material = createSolidMaterial(skin);
    this.mesh = new SketchMesh(geom, this.material);
    setAttribute(this.mesh, FACE, this);
    this.mesh.onMouseEnter = () => {
      this.ctx.highlightService.highlight(this.model.id);
    }
    this.mesh.onMouseLeave = () => {
      this.ctx.highlightService.unHighlight(this.model.id);
    }
    this.rootGroup.add(this.mesh);

    const wireframeGeom = new WireframeGeometry(geom);
    this.wireframeMaterial = new LineBasicMaterial({color: 0x2080ff});
    this.wireframeMesh = new LineSegments(wireframeGeom, this.wireframeMaterial);
    this.wireframeMesh.visible = false;
    this.wireframeGeometry = wireframeGeom;
    this.rootGroup.add(this.wireframeMesh);

    // Face debug mesh: each triangle gets a unique color based on its face index
    this.debugMesh = null;
    this.debugGeometry = null;
    this.debugMaterial = null;
    if (shellMesh && faceIdx >= 0 && shellMesh.faceTriRanges[faceIdx]) {
      this.debugGeometry = buildFaceDebugGeomFromShellMesh(shellMesh, faceIdx);
    } else if (face.brepFace?.data?.tessellation) {
      this.debugGeometry = buildFaceDebugGeom(face.brepFace.data.tessellation.data, face);
    }
    if (this.debugGeometry) {
      this.debugMaterial = new MeshBasicMaterial({vertexColors: true, side: DoubleSide});
      this.debugMesh = new SketchMesh(this.debugGeometry, this.debugMaterial);
      setAttribute(this.debugMesh, FACE, this);
      this.debugMesh.visible = false;
      this.rootGroup.add(this.debugMesh);
    }

    this.addDisposer(ctx.viewer.viewMode$.attach(mode => {
      const isDebug = mode === ViewMode.FACE_DEBUG;
      this.mesh.visible = !isDebug && (mode !== ViewMode.WIREFRAME);
      this.wireframeMesh.visible = (mode === ViewMode.MESH_WIREFRAME) || isDebug;
      if (this.debugMesh) this.debugMesh.visible = isDebug;
    }));
  }

  dispose() {
    super.dispose();
    this.material.dispose();
    this.geometry.dispose();
    this.wireframeMaterial.dispose();
    this.wireframeGeometry.dispose();
    if (this.debugGeometry) this.debugGeometry.dispose();
    if (this.debugMaterial) this.debugMaterial.dispose();
  }
}

export function setFacesColor(faces, color) {
  for (const face of faces) {
    if (color === null) {
      face.color.set(NULL_COLOR);
    } else {
      face.color.set( color );
    }
  }
}

const NULL_COLOR = 0xbfbfbf;

/**
 * Build a BufferGeometry for a single face from the shell's shared mesh buffer.
 */
function buildFaceGeomFromShellMesh(shellMesh, faceIdx) {
  const [start, end] = shellMesh.faceTriRanges[faceIdx];
  const triCount = end - start;
  if (triCount <= 0) return new BufferGeometry();

  const vertices = [];
  const normals = [];

  for (let t = start; t < end; t++) {
    const base = t * 9; // 3 verts × 3 components (non-indexed)
    for (let v = 0; v < 3; v++) {
      const off = base + v * 3;
      vertices.push(shellMesh.vertices[off], shellMesh.vertices[off + 1], shellMesh.vertices[off + 2]);
      normals.push(shellMesh.normals[off], shellMesh.normals[off + 1], shellMesh.normals[off + 2]);
    }
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geom.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  return geom;
}

function buildFaceDebugGeomFromShellMesh(shellMesh, faceIdx) {
  const [start, end] = shellMesh.faceTriRanges[faceIdx];
  const triCount = end - start;
  if (triCount <= 0) return null;

  const colorIdx = faceIdx % DEBUG_PALETTE.length;
  const faceColor = DEBUG_PALETTE[colorIdx];

  const vertices = [];
  const normals = [];
  const colors = [];

  for (let t = start; t < end; t++) {
    const base = t * 9;
    for (let v = 0; v < 3; v++) {
      const off = base + v * 3;
      vertices.push(shellMesh.vertices[off], shellMesh.vertices[off + 1], shellMesh.vertices[off + 2]);
      normals.push(shellMesh.normals[off], shellMesh.normals[off + 1], shellMesh.normals[off + 2]);
      colors.push(faceColor[0], faceColor[1], faceColor[2]);
    }
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geom.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geom.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  return geom;
}

// Distinct colors for face debug visualization
const DEBUG_PALETTE = [
  [1, 0.2, 0.2],   // red
  [0.2, 0.8, 0.2],  // green
  [0.3, 0.3, 1],    // blue
  [1, 0.8, 0.1],    // yellow
  [1, 0.4, 0.8],    // pink
  [0.1, 0.9, 0.9],  // cyan
  [1, 0.5, 0.1],    // orange
  [0.6, 0.3, 0.9],  // purple
  [0.5, 1, 0.5],    // light green
  [0.9, 0.9, 0.5],  // light yellow
  [0.4, 0.7, 1],    // light blue
  [1, 0.6, 0.6],    // salmon
];

// Global face index counter for consistent coloring across faces
let debugFaceCounter = 0;

function buildFaceDebugGeom(tessData, face) {
  const faceColorIdx = debugFaceCounter++ % DEBUG_PALETTE.length;
  const faceColor = DEBUG_PALETTE[faceColorIdx];

  const vertices = [];
  const normals = [];
  const colors = [];

  for (const [tr, normales] of tessData) {
    // Each triangle gets the face's color
    for (const p of tr) {
      vertices.push(p[0], p[1], p[2]);
      colors.push(faceColor[0], faceColor[1], faceColor[2]);
    }

    // Compute flat normal from triangle winding
    const a = tr[0], b = tr[1], c = tr[2];
    const abx = b[0]-a[0], aby = b[1]-a[1], abz = b[2]-a[2];
    const acx = c[0]-a[0], acy = c[1]-a[1], acz = c[2]-a[2];
    let nx = aby*acz - abz*acy;
    let ny = abz*acx - abx*acz;
    let nz = abx*acy - aby*acx;
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
    if (len > 0) { nx /= len; ny /= len; nz /= len; }
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geom.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geom.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  return geom;
}


import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {createSolidMaterial} from './viewUtils';
import {PATCH_CAGE} from '../../model/entities';
import {setAttribute} from 'scene/objectData';
import {ViewMode} from 'cad/scene/viewer';
import {
  BufferGeometry, BufferAttribute, Mesh, DoubleSide,
  WireframeGeometry, LineSegments, LineBasicMaterial,
  SphereGeometry, MeshBasicMaterial, Vector3, Object3D,
  Line
} from 'three';
import {TransformControls} from 'three/examples/jsm/controls/TransformControls';
import {ConstantScaleGroup} from 'scene/scaleHelper';
import {vdist} from 'patchCage/vec3Math';

const CP_COLOR = 0xffaa00;       // subcage control point (off-surface)
const CP_CORNER_COLOR = 0x00aaff; // corner control point (on-surface)
const CP_HOVER = 0xffdd44;
const CP_SELECTED = 0xff0000;
const CAGE_LINE_COLOR = 0xffaa00;
const HANDLE_SIZE = 4;

export class PatchCageView extends View {

  constructor(ctx, patchCage) {
    super(ctx, patchCage);
    this.rootGroup = SceneGraph.createGroup();
    this.ctx = ctx;

    // Surface
    this.geometry = buildGeom(patchCage.mesh);
    this.material = createSolidMaterial({side: DoubleSide});
    this.solidMesh = new Mesh(this.geometry, this.material);
    setAttribute(this.solidMesh, PATCH_CAGE, this);
    this.rootGroup.add(this.solidMesh);

    // Wireframe (non-pickable)
    this.wireframeGeometry = new WireframeGeometry(this.geometry);
    this.wireframeMaterial = new LineBasicMaterial({color: 0x2080ff, transparent: true, opacity: 0.3});
    this.wireframeMesh = new LineSegments(this.wireframeGeometry, this.wireframeMaterial);
    this.wireframeMesh.visible = false;
    this.wireframeMesh.raycast = () => {}; // disable raycast
    this.rootGroup.add(this.wireframeMesh);

    // Subcage group (visible when a patch is selected)
    this.subcageGroup = SceneGraph.createGroup();
    this.subcageGroup.visible = false;
    this.rootGroup.add(this.subcageGroup);
    this.subcageHandles = [];
    this.selectedPatchIdx = -1;
    this.selectedHandle = null;

    // Gizmo
    this.gizmoTarget = new Object3D();
    this.gizmo = null;
    this.setupGizmo();

    this.solidMesh.onMouseEnter = () => ctx.highlightService.highlight(this.model.id);
    this.solidMesh.onMouseLeave = () => ctx.highlightService.unHighlight(this.model.id);

    // Single click pick: listen on DOM, raycast against solidMesh only
    this._clickStartX = 0;
    this._clickStartY = 0;
    const dom = ctx.viewer.sceneSetup.renderer.domElement;
    this._onMouseDown = (e) => { this._clickStartX = e.offsetX; this._clickStartY = e.offsetY; };
    this._onMouseUp = (e) => {
      const dx = Math.abs(e.offsetX - this._clickStartX);
      const dy = Math.abs(e.offsetY - this._clickStartY);
      if (dx < 3 && dy < 3 && e.button === 0) {
        this.pickPatch(e);
      }
    };
    dom.addEventListener('mousedown', this._onMouseDown);
    dom.addEventListener('mouseup', this._onMouseUp);

    // Keyboard: when a patch is selected, press U/V to split along that direction at t=0.5
    this._onKeyDown = (e) => {
      if (this.selectedPatchIdx < 0) return;
      if (e.key === 'u' || e.key === 'U') {
        this.model.cage.splitIsoline(this.selectedPatchIdx, 'u', 0.5);
        this.model.recompute();
        this.selectPatch(-1);
        this.rebuildAll();
        this.persistCageState();
      } else if (e.key === 'v' || e.key === 'V') {
        this.model.cage.splitIsoline(this.selectedPatchIdx, 'v', 0.5);
        this.model.recompute();
        this.selectPatch(-1);
        this.rebuildAll();
        this.persistCageState();
      } else if (e.key === 'a' || e.key === 'A') {
        this.showArcDialog();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    setAttribute(this.rootGroup, PATCH_CAGE, this);
    setAttribute(this.rootGroup, View.MARKER, this);

    this.addDisposer(ctx.viewer.viewMode$.attach(mode => {
      this.solidMesh.visible = mode !== ViewMode.WIREFRAME;
      this.wireframeMesh.visible = mode === ViewMode.MESH_WIREFRAME || mode === ViewMode.FACE_DEBUG;
    }));
  }

  // ---- Patch picking ----

  pickPatch(e) {
    const ss = this.ctx.viewer.sceneSetup;
    const raycaster = ss.createRaycaster(e.offsetX, e.offsetY);

    // First: check if we hit a subcage handle
    if (this.subcageGroup.visible && this.subcageHandles.length > 0) {
      const handleHits = [];
      for (const h of this.subcageHandles) {
        h.traverse(child => {
          if (child.isMesh) child.raycast(raycaster, handleHits);
        });
      }
      if (handleHits.length > 0) {
        handleHits.sort((a, b) => a.distance - b.distance);
        // Find which handle was hit
        const hitObj = handleHits[0].object;
        for (const h of this.subcageHandles) {
          let found = false;
          h.traverse(child => { if (child === hitObj) found = true; });
          if (found) {
            this.selectSubcageHandle(h);
            return;
          }
        }
      }
    }

    // Second: check if we hit the solid mesh for patch selection
    const hits = [];
    this.solidMesh.raycast(raycaster, hits);

    if (hits.length === 0) {
      this.selectPatch(-1);
      return;
    }

    hits.sort((a, b) => a.distance - b.distance);
    const faceIndex = hits[0].faceIndex;
    if (faceIndex === undefined) {
      this.selectPatch(-1);
      return;
    }

    const ranges = this.model.mesh.faceTriRanges;
    for (let pi = 0; pi < ranges.length; pi++) {
      if (faceIndex >= ranges[pi][0] && faceIndex < ranges[pi][1]) {
        this.selectPatch(pi);
        return;
      }
    }
    this.selectPatch(-1);
  }

  selectPatch(idx) {
    this.deselectHandle();
    this.selectedPatchIdx = idx;
    if (idx < 0) {
      this.subcageGroup.visible = false;
      this.closePropsDialog();
    } else {
      this.buildSubcage(idx);
      this.subcageGroup.visible = true;
      this.showPropsDialog(idx);
    }
    this.ctx.viewer.requestRender();
  }

  // ---- Subcage: 4×4 control point grid displayed as 3×3 quads ----

  buildSubcage(patchIdx) {
    this.clearGroup(this.subcageGroup);
    this.subcageHandles = [];

    const patch = this.model.cage.patches[patchIdx];
    const ctrl = patch.grid;
    const ss = this.ctx.viewer.sceneSetup;
    const geom = new SphereGeometry(1);

    // 16 control point handles
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cv = ctrl[row][col]; // CageVertex instance
        const p = cv.position;
        const isCorner = (row === 0 || row === 3) && (col === 0 || col === 3);
        const baseColor = isCorner ? CP_CORNER_COLOR : CP_COLOR;

        const mat = new MeshBasicMaterial({color: baseColor, depthTest: false, transparent: true, opacity: 0.9});
        const sphere = new Mesh(geom, mat);
        sphere.renderOrder = 2;

        const handle = new ConstantScaleGroup(ss, HANDLE_SIZE * 2, 1, () => handle.position);
        handle.position.set(p[0], p[1], p[2]);
        handle.add(sphere);
        handle.userData = {patchIdx, row, col, isCorner, baseColor, cageVertex: cv};
        handle.__mat = mat;

        sphere.onMouseEnter = () => {
          if (this.selectedHandle !== handle) mat.color.setHex(CP_HOVER);
          this.ctx.viewer.requestRender();
        };
        sphere.onMouseLeave = () => {
          if (this.selectedHandle !== handle) mat.color.setHex(baseColor);
          this.ctx.viewer.requestRender();
        };
        sphere.onMouseClick = () => this.selectSubcageHandle(handle);

        this.subcageGroup.add(handle);
        this.subcageHandles.push(handle);
      }
    }

    // Grid lines: 3×3 quads = 4 horizontal lines + 4 vertical lines
    const lineMat = new LineBasicMaterial({color: CAGE_LINE_COLOR, depthTest: false, transparent: true, opacity: 0.6});
    lineMat.depthWrite = false;

    // Horizontal lines (along U, for each V row)
    for (let row = 0; row < 4; row++) {
      const pts = [];
      for (let col = 0; col < 4; col++) {
        const p = ctrl[row][col].position;
        pts.push(p[0], p[1], p[2]);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
      this.subcageGroup.add(new Line(g, lineMat));
    }

    // Vertical lines (along V, for each U column)
    for (let col = 0; col < 4; col++) {
      const pts = [];
      for (let row = 0; row < 4; row++) {
        const p = ctrl[row][col].position;
        pts.push(p[0], p[1], p[2]);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
      this.subcageGroup.add(new Line(g, lineMat));
    }
  }

  // ---- Handle selection + gizmo ----

  setupGizmo() {
    const ss = this.ctx.viewer.sceneSetup;
    this.gizmo = new TransformControls(ss.camera, ss.renderer.domElement);
    this.gizmo.setSize(0.7);
    this.gizmo.setMode('translate');
    this.gizmo.visible = false;
    this.gizmo.enabled = false;

    this.gizmo.addEventListener('dragging-changed', e => {
      ss.trackballControls.enabled = !e.value;
    });

    this.gizmo.addEventListener('change', () => {
      if (!this.selectedHandle) return;
      const ud = this.selectedHandle.userData;
      const pos = this.gizmoTarget.position;
      // Directly mutate the CageVertex — all patches sharing it update automatically
      ud.cageVertex.set(pos.x, pos.y, pos.z);

      if (!this._timer) {
        this._timer = requestAnimationFrame(() => {
          this._timer = null;
          this.model.recompute();
          this.rebuildAll();
        });
      }
    });

    this.gizmo.addEventListener('mouseUp', () => {
      this.model.recompute();
      this.rebuildAll();
      this.persistCageState();
    });

    ss.scene.add(this.gizmoTarget);
    ss.scene.add(this.gizmo);
  }

  selectSubcageHandle(handle) {
    this.deselectHandle();
    this.selectedHandle = handle;
    handle.__mat.color.setHex(CP_SELECTED);
    this.gizmoTarget.position.copy(handle.position);
    this.gizmo.attach(this.gizmoTarget);
    this.gizmo.visible = true;
    this.gizmo.enabled = true;
    this.ctx.viewer.requestRender();

  }

  deselectHandle() {
    if (this.selectedHandle) {
      this.selectedHandle.__mat.color.setHex(this.selectedHandle.userData.baseColor);
      this.selectedHandle = null;
    }
    this.gizmo.detach();
    this.gizmo.visible = false;
    this.gizmo.enabled = false;
  }

  // ---- Rebuild ----

  rebuildAll() {
    const g = buildGeom(this.model.mesh);
    this.solidMesh.geometry.dispose();
    this.solidMesh.geometry = g;
    this.geometry = g;

    const wg = new WireframeGeometry(g);
    this.wireframeMesh.geometry.dispose();
    this.wireframeMesh.geometry = wg;
    this.wireframeGeometry = wg;

    if (this.selectedPatchIdx >= 0) {
      this.buildSubcage(this.selectedPatchIdx);
      if (this._propsDialog) this.showPropsDialog(this.selectedPatchIdx);
    }

    this.ctx.viewer.requestRender();
  }

  // ---- Arc Constraint Dialog ----

  showArcDialog() {
    if (this.selectedPatchIdx < 0) return;
    if (this._arcDialog) { this.closeArcDialog(); return; }

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;left:10px;top:50%;transform:translateY(-50%);background:#2a2a2a;color:#eee;padding:16px;border-radius:8px;width:220px;font-family:sans-serif;font-size:13px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
    panel.innerHTML = `
      <div style="font-size:14px;font-weight:bold;margin-bottom:10px;">Arc Constraint</div>
      <div style="margin-bottom:6px;">
        <label>Edge</label>
        <select id="arc-side" style="width:100%;padding:3px;background:#333;color:#eee;border:1px solid #555;margin-top:2px;">
          <option value="0">Bottom</option>
          <option value="1">Right</option>
          <option value="2">Top</option>
          <option value="3">Left</option>
        </select>
      </div>
      <div style="margin-bottom:6px;">
        <label>Radius</label>
        <input id="arc-radius" type="number" value="50" step="1" style="width:100%;padding:3px;background:#333;color:#eee;border:1px solid #555;margin-top:2px;" />
      </div>
      <div style="margin-bottom:6px;">
        <label>Flip</label>
        <input id="arc-flip" type="checkbox" style="margin-left:8px;" />
      </div>
      <div style="margin-bottom:10px;">
        <label>Mode</label>
        <select id="arc-mode" style="width:100%;padding:3px;background:#333;color:#eee;border:1px solid #555;margin-top:2px;">
          <option value="approximate">Approximate (Bézier)</option>
          <option value="rational" selected>Rational (Exact NURBS)</option>
        </select>
      </div>
      <div style="display:flex;gap:6px;">
        <button id="arc-close" style="flex:1;padding:5px;background:#555;color:#eee;border:none;border-radius:4px;cursor:pointer;">Close</button>
        <button id="arc-remove" style="flex:1;padding:5px;background:#884444;color:#eee;border:none;border-radius:4px;cursor:pointer;">Remove</button>
      </div>
    `;

    document.body.appendChild(panel);
    this._arcDialog = panel;
    this._arcPatchIdx = this.selectedPatchIdx;
    this._arcDebounce = null;

    const applyLive = () => {
      if (this._arcDebounce) cancelAnimationFrame(this._arcDebounce);
      this._arcDebounce = requestAnimationFrame(() => {
        this._arcDebounce = null;
        this.applyArcFromDialog();
      });
    };

    panel.querySelector('#arc-side').oninput = applyLive;
    panel.querySelector('#arc-radius').oninput = applyLive;
    panel.querySelector('#arc-flip').oninput = applyLive;
    panel.querySelector('#arc-mode').oninput = applyLive;

    panel.querySelector('#arc-close').onclick = () => this.closeArcDialog();
    panel.querySelector('#arc-remove').onclick = () => {
      // Remove last constraint and revert
      const cage = this.model.cage;
      if (cage.arcConstraints.length > 0) {
        cage.removeArcConstraint(cage.arcConstraints[cage.arcConstraints.length - 1]);
      }
      this.model.recompute();
      this.rebuildAll();
      this.persistCageState();
      this.closeArcDialog();
    };

    // Apply immediately with defaults
    applyLive();
  }

  applyArcFromDialog() {
    if (!this._arcDialog) return;
    const panel = this._arcDialog;
    const patchIdx = this._arcPatchIdx;

    const side = parseInt(panel.querySelector('#arc-side').value);
    const radius = parseFloat(panel.querySelector('#arc-radius').value);
    const flip = panel.querySelector('#arc-flip').checked;
    const mode = panel.querySelector('#arc-mode').value;

    if (isNaN(radius) || radius <= 0) return;

    const cage = this.model.cage;
    const patch = cage.patches[patchIdx];
    if (!patch) return;

    // Compute angle from radius and chord length
    const edgeVerts = patch.getEdgeVertices(side);
    const p0 = edgeVerts[0].position;
    const p3 = edgeVerts[3].position;
    const chordLen = vdist(p0, p3);

    // For a circular arc: chord = 2 * r * sin(θ/2)
    // → sin(θ/2) = chord / (2r)
    // If chord > 2r, arc is impossible
    const sinHalf = Math.min(1, chordLen / (2 * radius));
    const angle = 2 * Math.asin(sinHalf) * (180 / Math.PI);

    let u = 0.5, v = 0.5;
    if (side === 0) v = 0;
    else if (side === 1) u = 1;
    else if (side === 2) v = 1;
    else if (side === 3) u = 0;
    let planeNormal = patch.normal(u, v);
    if (flip) planeNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]];

    // Remove previous constraint on this edge if exists
    cage.arcConstraints = cage.arcConstraints.filter(c => {
      if (c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === side) {
        if (c.mode === 'rational') {
          this.model.cage.patches[c.patchSide.patchIdx].rational = false;
        }
        return false;
      }
      return true;
    });

    cage.constrainEdgeToArc(patchIdx, side, radius, angle, planeNormal, mode);
    this.model.recompute();
    this.rebuildAll();
    if (this.selectedPatchIdx >= 0) {
      this.buildSubcage(this.selectedPatchIdx);
    }
    this.persistCageState();
  }

  closeArcDialog() {
    if (this._arcDialog) {
      document.body.removeChild(this._arcDialog);
      this._arcDialog = null;
    }
    if (this._arcDebounce) {
      cancelAnimationFrame(this._arcDebounce);
      this._arcDebounce = null;
    }
  }

  // ---- Patch Properties Dialog ----

  showPropsDialog(patchIdx) {
    this.closePropsDialog();

    const patch = this.model.cage.patches[patchIdx];
    const cage = this.model.cage;

    const round = (v) => Math.round(v * 1e6) / 1e6;
    const fmtVec = (p) => [round(p[0]), round(p[1]), round(p[2])];

    // Control points as 4x4 array of [x,y,z]
    const controlPoints = patch.grid.map(row => row.map(v => fmtVec(v.position)));

    // Weights
    const weights = patch.weights.map(row => row.map(w => round(w)));

    // Knots (uniform clamped cubic: [0,0,0,0,1,1,1,1])
    const knots = [0, 0, 0, 0, 1, 1, 1, 1];

    // Edge constraints on this patch
    const sideNames = ['bottom', 'right', 'top', 'left'];
    const constraints = [];
    for (const c of cage.arcConstraints) {
      if (c.patchSide && c.patchSide.patchIdx === patchIdx) {
        constraints.push({
          edge: sideNames[c.patchSide.side],
          type: 'arc',
          mode: c.mode,
          radius: round(c.radius),
          angle: round(c.angle),
          center: fmtVec(c.center),
          planeNormal: fmtVec(c.planeNormal),
        });
      }
    }

    const def = {
      patch: patchIdx,
      degree: [3, 3],
      knotsU: knots,
      knotsV: knots,
      rational: patch.rational,
      controlPoints,
      weights,
    };
    if (constraints.length > 0) {
      def.constraints = constraints;
    }

    const json = compactNumberArrays(JSON.stringify(def, null, 2));

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:10px;top:50%;transform:translateY(-50%);background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;width:340px;max-height:70vh;font-family:monospace;font-size:11px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;flex-direction:column;';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-family:sans-serif;font-size:13px;font-weight:bold;">Patch ${patchIdx} — NURBS Definition</span>
        <button id="props-close" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
      </div>
      <pre id="props-json" style="margin:0;overflow:auto;flex:1;background:#111;padding:8px;border-radius:4px;white-space:pre;user-select:all;cursor:text;line-height:1.4;">${escapeHtml(json)}</pre>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button id="props-copy" style="flex:1;padding:5px;background:#335;color:#eee;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;">Copy to Clipboard</button>
        <button id="props-subdivide" style="flex:1;padding:5px;background:#353;color:#eee;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;">Subdivide 3x3</button>
        <button id="props-remove" style="flex:1;padding:5px;background:#533;color:#eee;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;">Remove</button>
      </div>
    `;

    document.body.appendChild(panel);
    this._propsDialog = panel;

    panel.querySelector('#props-close').onclick = () => this.closePropsDialog();
    panel.querySelector('#props-copy').onclick = () => {
      navigator.clipboard.writeText(json).then(() => {
        panel.querySelector('#props-copy').textContent = 'Copied!';
        setTimeout(() => {
          if (panel.querySelector('#props-copy')) {
            panel.querySelector('#props-copy').textContent = 'Copy to Clipboard';
          }
        }, 1500);
      });
    };
    panel.querySelector('#props-subdivide').onclick = () => {
      this.model.cage.subdividePatch(patchIdx);
      this.model.recompute();
      this.selectPatch(-1);
      this.rebuildAll();
      this.persistCageState();
    };
    panel.querySelector('#props-remove').onclick = () => {
      this.model.cage.patches.splice(patchIdx, 1);
      this.model.recompute();
      this.selectPatch(-1);
      this.rebuildAll();
      this.persistCageState();
    };
  }

  closePropsDialog() {
    if (this._propsDialog) {
      document.body.removeChild(this._propsDialog);
      this._propsDialog = null;
    }
  }

  // ---- Persist cage state to originating operation ----

  persistCageState() {
    const opIdx = this.model.originatingOperation;
    if (opIdx === undefined || opIdx < 0) return;
    const cageState = this.model.serializeCage();
    this.ctx.craftService.updateOperationParams(opIdx, {cageState});
    this.ctx.projectService.scheduleSave();
  }

  // ---- Utilities ----

  clearGroup(group) {
    while (group.children.length > 0) {
      const c = group.children[0];
      group.remove(c);
      c.traverse(ch => { if (ch.geometry) ch.geometry.dispose(); if (ch.material) ch.material.dispose(); });
    }
  }

  updateVisuals() {
    this.solidMesh.material.color.set(this.color || 0xbfbfbf);
  }

  dispose() {
    const dom = this.ctx.viewer.sceneSetup.renderer.domElement;
    if (this._onMouseDown) dom.removeEventListener('mousedown', this._onMouseDown);
    if (this._onMouseUp) dom.removeEventListener('mouseup', this._onMouseUp);
    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    if (this.gizmo) {
      this.gizmo.detach(); this.gizmo.dispose();
      const s = this.ctx.viewer.sceneSetup.scene;
      s.remove(this.gizmo); s.remove(this.gizmoTarget);
    }
    this.closePropsDialog();
    this.closeArcDialog();
    this.geometry.dispose(); this.material.dispose();
    this.wireframeMaterial.dispose(); this.wireframeGeometry.dispose();
    this.clearGroup(this.subcageGroup);
    super.dispose();
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function compactNumberArrays(json) {
  return json.replace(/\[\s*(-?\d[\d.e+\-]*\s*,?\s*)+\]/g, match => {
    const nums = match.slice(1, -1).split(',').map(s => s.trim());
    return '[' + nums.join(', ') + ']';
  });
}

function buildGeom(mesh) {
  if (!mesh) return new BufferGeometry();
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(mesh.vertices, 3));
  g.setAttribute('normal', new BufferAttribute(mesh.normals, 3));
  if (mesh.indices) g.setIndex(new BufferAttribute(mesh.indices, 1));
  return g;
}

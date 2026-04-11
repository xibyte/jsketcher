/**
 * Three.js visual for a NurbsSurface entity.
 *
 * Owns:
 *   - The shaded mesh (geometry sourced from `surface.tessellate(res)`)
 *   - Per-patch hover / select material tinting
 *   - Per-patch selection visuals: flips visibility on its own Cage view,
 *     its 16 ControlPoint views (one per grid Vertex), and highlights its 4
 *     BoundingCurve views. Those views are owned by their respective
 *     entities (`entity.object3d`), so this class only toggles them — it
 *     never creates them.
 *
 * External wiring is limited to three scene-level callbacks passed via
 * `options`:
 *   - onHoverChanged(hovered)  — for set-level hover tinting and the
 *                                hover outline that lives in Scene.object3d
 *   - onClickPatch()           — raw click forwarded so Scene can run its
 *                                picking pipeline against other modal
 *                                modes (bridge, fill hole, etc.)
 *   - requestRender()          — re-render after material / visibility
 *                                changes
 */
import {
  BufferGeometry, BufferAttribute, Mesh, DoubleSide, MeshPhongMaterial, Group,
} from 'three';
import ScalableLine from 'scene/objects/scalableLine';
import type {NurbsSurface} from './NurbsSurface.entity';
import {
  EntityObject3D,
  createSurfaceMaterial,
  SURFACE_BASE_COLOR,
  SURFACE_HOVER_COLOR,
} from '../../three';

const WIREFRAME_COLOR = 0x1860c0;
const WIREFRAME_WIDTH = 1.5;

export class NurbsSurfaceObject3D extends EntityObject3D {

  readonly surface: NurbsSurface;
  readonly mesh: Mesh;
  private material: MeshPhongMaterial;
  private geometry: BufferGeometry;
  private resolution: number;
  private _hoverInSet: boolean = false;
  /** UV-grid wireframe overlay (mesh view mode). Hidden by default. */
  private wireframeGroup: Group;
  private _wireframeBuilt: boolean = false;

  constructor(surface: NurbsSurface, resolution: number = 8) {
    super();
    this.surface = surface;
    this.resolution = resolution;

    this.material = createSurfaceMaterial(SURFACE_BASE_COLOR);
    this.material.side = DoubleSide;
    this.material.shininess = 80;
    this.material.specular.setHex(0x444444);

    this.geometry = this._buildGeometry();
    this.mesh = new Mesh(this.geometry, this.material);
    (this.mesh as any).userData = {entity: surface};
    this.add(this.mesh);

    // Wireframe overlay — populated lazily on first setWireframeVisible.
    this.wireframeGroup = new Group();
    this.wireframeGroup.visible = false;
    (this.wireframeGroup as any).raycast = () => {};
    this.add(this.wireframeGroup);

    // Hover: the mesh is the click / hover target. Set-level tinting
    // (dim-highlighting sibling surfaces in the same SurfaceSet) is
    // driven entirely from within the entity — no external callback.
    const self = this;
    (this.mesh as any).onMouseEnter = () => {
      if (self._selected) return;
      self.setHover(true);
      self._tintSet(true);
    };
    (this.mesh as any).onMouseLeave = () => {
      if (self._selected) return;
      self.setHover(false);
      self._tintSet(false);
    };
  }

  /**
   * Retessellate the surface and replace the mesh geometry. Invoked by
   * NurbsSurface.invalidateVisual on the next animation frame.
   */
  rebuild(): void {
    const next = this._buildGeometry();
    this.geometry.dispose();
    this.geometry = next;
    this.mesh.geometry = this.geometry;
    // Wireframe tracks the same tessellation — rebuild if it's been
    // built at least once so it doesn't drift after a drag.
    if (this._wireframeBuilt) this._rebuildWireframe();
    this.surface.ctx.requestRender();
  }

  // ---- View-mode toggles ----------------------------------------------

  /** Show / hide the shaded mesh (faces view mode). */
  setFacesVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  /**
   * Show / hide the UV-isoline wireframe overlay (mesh view mode).
   * First call lazily builds the wireframe from the current
   * tessellation — a surface that's never shown as wireframe never
   * pays the ScalableLine allocation cost.
   */
  setWireframeVisible(visible: boolean): void {
    if (visible && !this._wireframeBuilt) this._rebuildWireframe();
    this.wireframeGroup.visible = visible;
  }

  private _rebuildWireframe(): void {
    // Clear the previous lines.
    for (const child of [...this.wireframeGroup.children]) {
      this.wireframeGroup.remove(child);
      const g = (child as any).geometry;
      const m = (child as any).material;
      if (g && g.dispose) g.dispose();
      if (m && m.dispose) m.dispose();
    }
    const ss = this.surface.ctx.sceneSetup;
    const {rows, cols} = this.surface.getIsolinePolylines(this.resolution);
    // Skip the first and last row/col — those are the boundary curves,
    // drawn separately by the BoundingCurveObject3D view.
    for (let i = 1; i < rows.length - 1; i++) {
      const line = new ScalableLine(ss, rows[i], WIREFRAME_WIDTH, WIREFRAME_COLOR);
      line.material.transparent = true;
      line.material.opacity = 0.7;
      line.renderOrder = 1;
      (line as any).raycast = () => {};
      this.wireframeGroup.add(line);
    }
    for (let i = 1; i < cols.length - 1; i++) {
      const line = new ScalableLine(ss, cols[i], WIREFRAME_WIDTH, WIREFRAME_COLOR);
      line.material.transparent = true;
      line.material.opacity = 0.7;
      line.renderOrder = 1;
      (line as any).raycast = () => {};
      this.wireframeGroup.add(line);
    }
    this._wireframeBuilt = true;
  }

  /**
   * Propagate hover tint to sibling surfaces that share the same
   * SurfaceSet. Each sibling gets a dim "hover in set" highlight so
   * logical faces (e.g. one cylinder cap made of 5 patches) behave as
   * a single hover target.
   */
  private _tintSet(hovered: boolean): void {
    const set = this.surface.surfaceSet;
    if (!set) return;
    for (const sibling of set.surfaces) {
      if (sibling === this.surface) continue;
      const view: any = sibling.object3d;
      if (view && typeof view.setHoverInSet === 'function') {
        view.setHoverInSet(hovered);
      }
    }
  }

  /** Scene-level tinting: "a surface in the same set is hovered". */
  setHoverInSet(hover: boolean): void {
    if (this._hoverInSet === hover) return;
    this._hoverInSet = hover;
    this.applyColor();
  }

  protected onHoverChanged(_hover: boolean): void {
    this.applyColor();
  }

  protected onSelectedChanged(selected: boolean): void {
    this.applyColor();
    this._toggleSelectionVisuals(selected);
    this.surface.ctx.requestRender();
  }

  /**
   * Flip the Cage, ControlPoint, and BoundingCurve overlays for THIS
   * surface based on the selection state. Reads straight from
   * `entity.object3d` — these views live on the entities themselves,
   * never on the scene.
   */
  private _toggleSelectionVisuals(selected: boolean): void {
    const surface = this.surface;

    // Cage outline (one per surface)
    const cageView: any = surface.cage?.object3d;
    if (cageView) {
      if (selected && typeof cageView.rebuild === 'function') cageView.rebuild();
      cageView.visible = selected;
    }

    // Control-point handles — 16 per surface, shared by identity with
    // any adjacent surface that references the same CP. The handle is
    // owned by the Vertex itself (lazy), so we just toggle its public
    // setVisible API; reads / writes go through the entity.
    for (const row of surface.grid) {
      for (const cp of row) {
        if (selected) {
          cp.setVisible(true);
        } else {
          cp.setVisible(false);
          cp.setSelected(false);
          cp.setHovered(false);
        }
      }
    }

    // Bounding-curve highlights — 4 per surface, shared. setHighlightSide
    // owns the visibility + rebuild; we never rebuild manually here or
    // we'd race the state change and paint with a stale color.
    const sides = [
      surface.boundingCurves.bottom,
      surface.boundingCurves.right,
      surface.boundingCurves.top,
      surface.boundingCurves.left,
    ];
    for (let s = 0; s < 4; s++) {
      const cv: any = sides[s]?.object3d;
      if (!cv) continue;
      if (selected) {
        cv.setHighlightSide(s);
      } else {
        cv.setHighlightSide(-1);
        if (typeof cv.setSelected === 'function') cv.setSelected(false);
      }
    }
  }

  private applyColor(): void {
    // Selection is communicated by the cage + highlighted boundary curves,
    // not by tinting the surface — leave the base/hover colors alone.
    const highlighted = this._hovered || this._hoverInSet;
    if (highlighted) {
      this.material.color.setHex(SURFACE_HOVER_COLOR);
      // Kill the Phong glare while highlighted so the hover tint reads as
      // a flat fill instead of a shiny blob under the key light.
      this.material.shininess = 0;
      this.material.specular.setHex(0x000000);
    } else {
      this.material.color.setHex(SURFACE_BASE_COLOR);
      this.material.shininess = 80;
      this.material.specular.setHex(0x444444);
    }
  }

  private _buildGeometry(): BufferGeometry {
    const t = this.surface.tessellate(this.resolution);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(t.positions), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(t.normals), 3));
    g.setIndex(new BufferAttribute(new Uint32Array(t.indices), 1));
    return g;
  }

  protected onDispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    for (const child of [...this.wireframeGroup.children]) {
      const g = (child as any).geometry;
      const m = (child as any).material;
      if (g && g.dispose) g.dispose();
      if (m && m.dispose) m.dispose();
    }
  }
}

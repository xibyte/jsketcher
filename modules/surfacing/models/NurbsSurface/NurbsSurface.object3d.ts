/**
 * Dumb Three.js view for a NurbsSurface entity.
 *
 * Owns only the shaded mesh + an optional UV-isoline wireframe overlay.
 * All visual-state decisions (hover, selection, set-hover tint, cage
 * visibility, CP handle toggling, bounding-curve highlighting) live on
 * the NurbsSurface entity. This class exposes thin imperative methods:
 *
 *   - `rebuildGeometry()` — rebuild the mesh from the surface's current
 *     tessellation (called from NurbsSurface.invalidateVisual).
 *   - `setTint(color, glare)` — repaint the material and optionally kill
 *     the Phong glare (used by mark/unmark).
 *   - `setFacesVisible(bool)` / `setWireframeVisible(bool)` — view-mode
 *     flags propagated from the editor.
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
} from '../../three';

const WIREFRAME_COLOR = 0x1860c0;
const WIREFRAME_WIDTH = 1.5;

export class NurbsSurfaceObject3D extends EntityObject3D {

  readonly surface: NurbsSurface;
  readonly mesh: Mesh;
  private material: MeshPhongMaterial;
  private geometry: BufferGeometry;
  private resolution: number;
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
    // Nudge triangles slightly back so boundary-curve lines drawn at the
    // edge with depthTest=true don't z-fight and vanish.
    this.material.polygonOffset = true;
    this.material.polygonOffsetFactor = 1;
    this.material.polygonOffsetUnits = 1;

    this.geometry = this._buildGeometry();
    this.mesh = new Mesh(this.geometry, this.material);
    (this.mesh as any).userData = {entity: surface};
    this.add(this.mesh);

    // Wireframe overlay — populated lazily on first setWireframeVisible.
    this.wireframeGroup = new Group();
    this.wireframeGroup.visible = false;
    (this.wireframeGroup as any).raycast = () => {};
    this.add(this.wireframeGroup);
  }

  /**
   * Retessellate the surface and replace the mesh geometry. Invoked by
   * NurbsSurface.invalidateVisual on the next animation frame.
   */
  rebuildGeometry(): void {
    const next = this._buildGeometry();
    this.geometry.dispose();
    this.geometry = next;
    this.mesh.geometry = this.geometry;
    if (this._wireframeBuilt) this._rebuildWireframe();
    this.surface.ctx.requestRender();
  }

  /**
   * Paint the surface material with `color`. If `glare` is false we kill
   * the Phong specular highlight so the tint reads as a flat fill.
   */
  setTint(color: number, glare: boolean): void {
    this.material.color.setHex(color);
    this.material.shininess = glare ? 80 : 0;
    this.material.specular.setHex(glare ? 0x444444 : 0x000000);
    this.surface.ctx.requestRender();
  }

  /** Show / hide the shaded mesh (faces view mode). */
  setFacesVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  /** Show / hide the UV-isoline wireframe overlay (mesh view mode). */
  setWireframeVisible(visible: boolean): void {
    if (visible && !this._wireframeBuilt) this._rebuildWireframe();
    this.wireframeGroup.visible = visible;
  }

  private _rebuildWireframe(): void {
    for (const child of [...this.wireframeGroup.children]) {
      this.wireframeGroup.remove(child);
      const g = (child as any).geometry;
      const m = (child as any).material;
      if (g && g.dispose) g.dispose();
      if (m && m.dispose) m.dispose();
    }
    const ss = this.surface.ctx.sceneSetup;
    const {rows, cols} = this.surface.getIsolinePolylines(this.resolution);
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

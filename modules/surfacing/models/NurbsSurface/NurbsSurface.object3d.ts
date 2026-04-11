import {
  BufferGeometry, Mesh, LineSegments, WireframeGeometry,
} from 'three';
import type {NurbsSurface} from './NurbsSurface.entity';
import {
  EntityObject3D,
  buildTessellatedGeometry,
  buildOffsetSurfaceGeometry,
  createSurfaceMaterial,
  createWireframeMaterial,
  createHoverHighlightMaterial,
  SURFACE_BASE_COLOR,
  SURFACE_HOVER_COLOR,
  SURFACE_SELECTED_COLOR,
} from '../../three';

/**
 * Three.js visual for a NurbsSurface entity.
 * Composed of:
 *   - shaded solid mesh (MeshPhongMaterial)
 *   - wireframe overlay (hidden by default, non-pickable)
 *   - optional hover-highlight wash (non-pickable)
 */
export class NurbsSurfaceObject3D extends EntityObject3D {

  solidMesh: Mesh;
  wireframeMesh: LineSegments;
  hoverMesh: Mesh | null = null;

  private geometry: BufferGeometry;
  private material = createSurfaceMaterial();
  private wireframeGeometry: WireframeGeometry;
  private wireframeMaterial = createWireframeMaterial();

  constructor(surface: NurbsSurface, resolution: number = 8) {
    super();

    const tess = surface.tessellate(resolution);
    this.geometry = buildTessellatedGeometry(tess);

    this.solidMesh = new Mesh(this.geometry, this.material);
    this.add(this.solidMesh);

    this.wireframeGeometry = new WireframeGeometry(this.geometry);
    this.wireframeMesh = new LineSegments(this.wireframeGeometry, this.wireframeMaterial);
    this.wireframeMesh.visible = false;
    this.wireframeMesh.raycast = () => {};
    this.add(this.wireframeMesh);
  }

  /** Rebuild geometry after surface control points change */
  rebuild(surface: NurbsSurface, resolution: number = 8): void {
    const tess = surface.tessellate(resolution);

    this.geometry.dispose();
    this.geometry = buildTessellatedGeometry(tess);
    this.solidMesh.geometry = this.geometry;

    this.wireframeGeometry.dispose();
    this.wireframeGeometry = new WireframeGeometry(this.geometry);
    this.wireframeMesh.geometry = this.wireframeGeometry;
  }

  /**
   * Optional legacy hover-highlight wash — kept for code paths that still
   * build an offset overlay mesh. New code should prefer tinting the
   * solid mesh via setHover() instead.
   */
  setHoverOverlay(show: boolean, surface?: NurbsSurface, resolution?: number): void {
    if (this.hoverMesh) {
      this.remove(this.hoverMesh);
      this.hoverMesh.geometry.dispose();
      (this.hoverMesh.material as any).dispose();
      this.hoverMesh = null;
    }

    if (show && surface && resolution) {
      const tess = surface.tessellate(resolution);
      const geo = buildOffsetSurfaceGeometry(tess, 0.3);
      const mat = createHoverHighlightMaterial(SURFACE_HOVER_COLOR);
      this.hoverMesh = new Mesh(geo, mat);
      this.hoverMesh.renderOrder = 0;
      this.hoverMesh.raycast = () => {};
      this.add(this.hoverMesh);
    }
  }

  protected onHoverChanged(hover: boolean): void {
    if (!this._selected) {
      this.material.color.setHex(hover ? SURFACE_HOVER_COLOR : SURFACE_BASE_COLOR);
    }
  }

  protected onSelectedChanged(selected: boolean): void {
    this.material.color.setHex(
      selected ? SURFACE_SELECTED_COLOR
               : (this._hovered ? SURFACE_HOVER_COLOR : SURFACE_BASE_COLOR)
    );
  }

  protected onDispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.wireframeGeometry.dispose();
    this.wireframeMaterial.dispose();
    this.setHoverOverlay(false);
  }
}

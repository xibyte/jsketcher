import {
  Group, BufferGeometry, BufferAttribute, Mesh, DoubleSide,
  WireframeGeometry, LineSegments, LineBasicMaterial,
  MeshPhongMaterial, MeshBasicMaterial
} from 'three';
import type {NurbsSurface} from './NurbsSurface.entity';

const SURFACE_COLOR = 0xd0d0d0;
const HOVER_COLOR = 0x88bbee;
const WIREFRAME_COLOR = 0x2080ff;

/**
 * Three.js Object3D for a NurbsSurface entity.
 * Contains the tessellated solid mesh, wireframe overlay, and hover highlight.
 */
export class NurbsSurfaceObject3D extends Group {

  solidMesh: Mesh;
  wireframeMesh: LineSegments;
  hoverMesh: Mesh | null = null;

  private geometry: BufferGeometry;
  private material: MeshPhongMaterial;
  private wireframeGeometry: WireframeGeometry;
  private wireframeMaterial: LineBasicMaterial;

  constructor(surface: NurbsSurface, resolution: number = 8) {
    super();

    const tess = surface.tessellate(resolution);
    this.geometry = buildGeometry(tess);

    this.material = new MeshPhongMaterial({
      side: DoubleSide,
      color: SURFACE_COLOR,
      shininess: 80,
      specular: 0x444444,
    });
    this.solidMesh = new Mesh(this.geometry, this.material);
    this.add(this.solidMesh);

    // Wireframe overlay (non-pickable, hidden by default)
    this.wireframeGeometry = new WireframeGeometry(this.geometry);
    this.wireframeMaterial = new LineBasicMaterial({
      color: WIREFRAME_COLOR, transparent: true, opacity: 0.3
    });
    this.wireframeMesh = new LineSegments(this.wireframeGeometry, this.wireframeMaterial);
    this.wireframeMesh.visible = false;
    this.wireframeMesh.raycast = () => {};
    this.add(this.wireframeMesh);
  }

  /** Rebuild geometry after surface control points change */
  rebuild(surface: NurbsSurface, resolution: number = 8): void {
    const tess = surface.tessellate(resolution);

    this.geometry.dispose();
    this.geometry = buildGeometry(tess);
    this.solidMesh.geometry = this.geometry;

    this.wireframeGeometry.dispose();
    this.wireframeGeometry = new WireframeGeometry(this.geometry);
    this.wireframeMesh.geometry = this.wireframeGeometry;
  }

  /** Show/hide hover highlight for this surface */
  setHover(show: boolean, surface?: NurbsSurface, resolution?: number): void {
    if (this.hoverMesh) {
      this.remove(this.hoverMesh);
      this.hoverMesh.geometry.dispose();
      (this.hoverMesh.material as MeshBasicMaterial).dispose();
      this.hoverMesh = null;
    }

    if (show && surface && resolution) {
      const tess = surface.tessellate(resolution);
      const offsetVerts = new Float32Array(tess.positions.length);
      for (let i = 0; i < tess.positions.length; i += 3) {
        offsetVerts[i]   = tess.positions[i]   + tess.normals[i]   * 0.3;
        offsetVerts[i+1] = tess.positions[i+1] + tess.normals[i+1] * 0.3;
        offsetVerts[i+2] = tess.positions[i+2] + tess.normals[i+2] * 0.3;
      }
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(offsetVerts, 3));
      geo.setAttribute('normal', new BufferAttribute(new Float32Array(tess.normals), 3));
      geo.setIndex(new BufferAttribute(new Uint32Array(tess.indices), 1));

      const mat = new MeshBasicMaterial({
        color: HOVER_COLOR, transparent: true, opacity: 0.25,
        side: DoubleSide, depthTest: true
      });
      this.hoverMesh = new Mesh(geo, mat);
      this.hoverMesh.renderOrder = 0;
      this.hoverMesh.raycast = () => {};
      this.add(this.hoverMesh);
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.wireframeGeometry.dispose();
    this.wireframeMaterial.dispose();
    this.setHover(false);
  }
}

function buildGeometry(tess: {positions: number[], normals: number[], indices: number[]}): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(tess.positions), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(tess.normals), 3));
  g.setIndex(new BufferAttribute(new Uint32Array(tess.indices), 1));
  return g;
}

import {
  Mesh, CylinderGeometry, ConeGeometry, SphereGeometry,
  MeshPhongMaterial, Vector3, Quaternion, Raycaster,
} from 'three';
import {ConstantScaleGroup} from 'scene/scaleHelper';
import type {Vec3} from '../../patchCageTypes';
import type {SurfacingEditor} from '../../SurfacingEditor';

// Visual tuning — a slender, elegant double arrow with a central grip
// bead. Phong material lights it enough to read as a 3D object rather
// than a flat overlay, while emissive self-lighting keeps it visible
// even in dim spots.
const COLOR_BASE = 0xffb000;
const COLOR_HOVER = 0xffe055;
const COLOR_EMISSIVE = 0x2a1800;
const COLOR_SPECULAR = 0xffe5b0;

// Geometry is built in arbitrary "model" units; the ConstantScaleGroup
// rescales the whole group so the arrow occupies ARROW_SIZE_PX pixels
// of screen height regardless of camera distance / zoom.
const SHAFT_RADIUS = 0.9;
const SHAFT_LENGTH = 28;
const CONE_RADIUS = 3.8;
const CONE_LENGTH = 10;
const GRIP_RADIUS = 2.4;
const ARROW_MODEL_LENGTH = SHAFT_LENGTH + 2 * CONE_LENGTH;
const ARROW_SIZE_PX = 110;
const RENDER_ORDER = 5;

export interface PushPullHandleOptions {
  /** Anchor point — world position the arrow centers on at distance 0. */
  origin: Vec3;
  /** Direction the arrow points + drag axis. Will be normalized. */
  normal: Vec3;
  editor: SurfacingEditor;
  /** Fired on each drag tick with the *delta* distance since last tick. */
  onDragDistance: (delta: number) => void;
  /** Fired on mouse-up at the end of a drag gesture. */
  onDragEnd: () => void;
}

/**
 * A thick two-sided arrow that floats above a surface and drags along
 * its surface normal. Owns its own DOM event listeners (capturing-phase
 * mousedown on the canvas, plus document-level mousemove / mouseup so
 * the drag survives cursor leaving the canvas).
 *
 * Visual: cylinder shaft + two cones (one at each end), oriented so the
 * cylinder's local Y axis aligns with the surface normal.
 *
 * The handle is positional only — it does NOT apply any geometry
 * change itself. It just reports the drag distance via the callbacks
 * and the wizard wires that to its `pushPull(...)` op call.
 */
export class PushPullHandle {

  private group: ConstantScaleGroup;
  private cylinder: Mesh;
  private topCone: Mesh;
  private bottomCone: Mesh;
  private grip: Mesh;
  private material: MeshPhongMaterial;

  private readonly origin: Vector3;
  private readonly normal: Vector3;
  private currentDistance = 0;

  private editor: SurfacingEditor;
  private opts: PushPullHandleOptions;

  private raycaster = new Raycaster();
  private dragging = false;
  private hovering = false;
  /** Cursor's projected axis-distance at the moment mousedown happened. */
  private dragAnchorDistance = 0;
  /** The handle's own distance at the moment mousedown happened. */
  private dragStartDistance = 0;

  private readonly onMouseDown: (e: MouseEvent) => void;
  private readonly onMouseMove: (e: MouseEvent) => void;
  private readonly onMouseUp: (e: MouseEvent) => void;

  constructor(opts: PushPullHandleOptions) {
    this.opts = opts;
    this.editor = opts.editor;
    this.origin = new Vector3(opts.origin[0], opts.origin[1], opts.origin[2]);
    this.normal = new Vector3(opts.normal[0], opts.normal[1], opts.normal[2]).normalize();

    this.material = new MeshPhongMaterial({
      color: COLOR_BASE,
      emissive: COLOR_EMISSIVE,
      specular: COLOR_SPECULAR,
      shininess: 110,
      depthTest: false,
      transparent: true,
      opacity: 0.92,
    });

    // Build the arrow as a ConstantScaleGroup whose local Y axis is the
    // drag axis. We orient the group later so local Y matches the world
    // surface normal. The group rescales itself every frame so the
    // arrow occupies a fixed pixel height regardless of camera zoom.
    this.group = new ConstantScaleGroup(
      this.editor.sceneSetup, ARROW_SIZE_PX, ARROW_MODEL_LENGTH,
      () => this.group.position,
    );
    this.group.renderOrder = RENDER_ORDER;

    const shaftGeom = new CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, SHAFT_LENGTH, 24);
    this.cylinder = new Mesh(shaftGeom, this.material);
    this.cylinder.renderOrder = RENDER_ORDER;
    this.group.add(this.cylinder);

    // Cones: tall + narrow (radius 3.8, length 10) for a more elegant
    // arrow head than the squat default.
    const coneGeom = new ConeGeometry(CONE_RADIUS, CONE_LENGTH, 24);
    this.topCone = new Mesh(coneGeom, this.material);
    this.topCone.position.y = SHAFT_LENGTH / 2 + CONE_LENGTH / 2;
    this.topCone.renderOrder = RENDER_ORDER;
    this.group.add(this.topCone);

    // Second cone at the bottom — share the same geometry, flip 180°.
    this.bottomCone = new Mesh(coneGeom, this.material);
    this.bottomCone.position.y = -(SHAFT_LENGTH / 2 + CONE_LENGTH / 2);
    this.bottomCone.rotation.x = Math.PI;
    this.bottomCone.renderOrder = RENDER_ORDER;
    this.group.add(this.bottomCone);

    // Central grip bead — reads as "grab here", and gives the hit
    // target a bit more area for imprecise clicks near the centroid.
    const gripGeom = new SphereGeometry(GRIP_RADIUS, 24, 16);
    this.grip = new Mesh(gripGeom, this.material);
    this.grip.renderOrder = RENDER_ORDER;
    this.group.add(this.grip);

    // Orient the group so local +Y aligns with the surface normal.
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), this.normal);
    this.group.quaternion.copy(q);

    this.updatePosition();
    this.editor.workingGroup.add(this.group);

    // Bind once so we can pass the same references to remove later.
    this.onMouseDown = (e) => this.handleMouseDown(e);
    this.onMouseMove = (e) => this.handleMouseMove(e);
    this.onMouseUp = (e) => this.handleMouseUp(e);

    const dom = (this.editor.sceneSetup as any).renderer.domElement as HTMLElement;
    dom.addEventListener('mousedown', this.onMouseDown, true);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    this.editor.requestRender();
  }

  /**
   * Programmatically jump to a specific signed distance from the
   * origin. Fires onDragDistance with the delta so the wizard can
   * apply the corresponding op step.
   */
  setDistance(distance: number): void {
    const delta = distance - this.currentDistance;
    if (Math.abs(delta) < 1e-9) return;
    this.currentDistance = distance;
    this.updatePosition();
    this.opts.onDragDistance(delta);
    this.editor.requestRender();
  }

  /** Current signed distance from origin along the drag axis. */
  get distance(): number {
    return this.currentDistance;
  }

  dispose(): void {
    const dom = (this.editor.sceneSetup as any).renderer.domElement as HTMLElement;
    dom.removeEventListener('mousedown', this.onMouseDown, true);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.editor.workingGroup.remove(this.group);
    this.cylinder.geometry.dispose();
    this.topCone.geometry.dispose(); // shared with bottomCone
    this.grip.geometry.dispose();
    this.material.dispose();
    this.editor.requestRender();
  }

  // -----------------------------------------------------------------------

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const ndc = this.cursorNdc(e);
    if (!ndc) return;
    this.raycaster.setFromCamera(ndc, (this.editor.sceneSetup as any).camera);
    const hits = this.raycaster.intersectObject(this.group, true);
    if (hits.length === 0) return;
    e.stopPropagation();
    e.preventDefault();

    // Record the offset between where the cursor projects onto the
    // drag axis vs where the handle actually is. Subsequent mousemove
    // ticks apply cursor *travel* since mousedown, so the grab point
    // stays pinned under the cursor — no initial jump.
    const ray = this.raycaster.ray;
    const closest = closestPointOnLineToRay(this.origin, this.normal, ray.origin, ray.direction);
    this.dragAnchorDistance = closest.clone().sub(this.origin).dot(this.normal);
    this.dragStartDistance = this.currentDistance;
    this.dragging = true;
  }

  private handleMouseMove(e: MouseEvent): void {
    // Hover detection — highlight when the cursor is over the arrow.
    if (!this.dragging) {
      const ndc = this.cursorNdc(e);
      if (!ndc) return;
      this.raycaster.setFromCamera(ndc, (this.editor.sceneSetup as any).camera);
      const over = this.raycaster.intersectObject(this.group, true).length > 0;
      if (over !== this.hovering) {
        this.hovering = over;
        this.material.color.setHex(over ? COLOR_HOVER : COLOR_BASE);
        this.editor.requestRender();
      }
      return;
    }

    const ndc = this.cursorNdc(e);
    if (!ndc) return;
    this.raycaster.setFromCamera(ndc, (this.editor.sceneSetup as any).camera);
    const ray = this.raycaster.ray;

    // Closest point on the drag line (origin + t * normal) to the
    // cursor's view ray. Standard two-line distance formula.
    const closest = closestPointOnLineToRay(this.origin, this.normal, ray.origin, ray.direction);
    const cursorDistance = closest.clone().sub(this.origin).dot(this.normal);
    // New handle distance = where it was at mousedown + cursor travel
    // since then (preserves the grab offset, no jump on first move).
    const newDistance = this.dragStartDistance + (cursorDistance - this.dragAnchorDistance);
    const delta = newDistance - this.currentDistance;
    if (Math.abs(delta) < 1e-9) return;

    this.currentDistance = newDistance;
    this.updatePosition();
    this.opts.onDragDistance(delta);
    this.editor.requestRender();
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.opts.onDragEnd();
  }

  private cursorNdc(e: MouseEvent): {x: number; y: number} | null {
    const dom = (this.editor.sceneSetup as any).renderer.domElement as HTMLElement;
    const rect = dom.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

  private updatePosition(): void {
    const pos = this.origin.clone().addScaledVector(this.normal, this.currentDistance);
    this.group.position.copy(pos);
  }
}

/**
 * Closest point on the infinite line `linePoint + t·lineDir` to the
 * infinite ray `rayOrigin + s·rayDir`. Both directions are assumed to
 * be unit length.
 */
function closestPointOnLineToRay(
  linePoint: Vector3, lineDir: Vector3,
  rayOrigin: Vector3, rayDir: Vector3,
): Vector3 {
  const w0 = new Vector3().subVectors(linePoint, rayOrigin);
  const a = lineDir.dot(lineDir);
  const b = lineDir.dot(rayDir);
  const c = rayDir.dot(rayDir);
  const d = lineDir.dot(w0);
  const e = rayDir.dot(w0);
  const denom = a * c - b * b;
  if (Math.abs(denom) < 1e-9) return linePoint.clone();
  const t = (b * e - c * d) / denom;
  return linePoint.clone().addScaledVector(lineDir, t);
}

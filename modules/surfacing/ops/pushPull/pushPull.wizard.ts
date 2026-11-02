import {state, type StateStream} from 'lstream';
import type {SurfacingEditor} from '../../SurfacingEditor';
import type {NurbsSurface} from '../../models/NurbsSurface/NurbsSurface.entity';
import type {Vec3} from '../../patchCageTypes';
import {addToPort, removeFromPort} from '../../ui/SurfacingUI';
import {pushPull} from './pushPull.command';
import {PushPullHandle} from './pushPull.handle';
import {pushPullUI} from './pushPull.ui';

export const PUSH_PULL_PORT_ID = 'pushPull';

export interface PushPullWizardState {
  /** Signed distance from the original surface position. */
  distance: number;
}

/**
 * Wizard for an interactive push/pull on one surface.
 *
 *   const wiz = new PushPullWizard(editor, surface);
 *
 * On construction:
 *   - captures the cage centroid + the surface normal at (0.5, 0.5)
 *     so dragging is along a fixed direction even if the surface
 *     deforms partway through the gesture
 *   - mounts the 3D arrow handle and wires its drag callbacks
 *   - mounts the bottom-port React UI (banner + numeric input)
 *
 * The wizard is the sole owner of its state, its handle, and its UI
 * port entry. `dispose()` tears all three down. The UI's Close button
 * calls `dispose()` directly; the wizard does not interact with the
 * tool stack at all.
 */
export class PushPullWizard {

  readonly state$: StateStream<PushPullWizardState> = state<PushPullWizardState>({distance: 0});

  readonly editor: SurfacingEditor;
  readonly surface: NurbsSurface;

  private handle: PushPullHandle;

  constructor(editor: SurfacingEditor, surface: NurbsSurface) {
    this.editor = editor;
    this.surface = surface;

    const origin = computeCentroid(surface);
    const normal = surface.normal(0.5, 0.5);

    this.handle = new PushPullHandle({
      origin,
      normal,
      editor,
      onDragDistance: (delta) => this.applyDelta(delta),
      onDragEnd: () => this.editor.commit(),
    });

    addToPort('bottom', PUSH_PULL_PORT_ID, pushPullUI(this));
  }

  /**
   * Programmatically jump to a specific signed distance — called from
   * the input field on Enter / blur / Go-button click. Drives the
   * handle, which in turn calls back through onDragDistance.
   */
  setDistance(distance: number): void {
    if (Number.isNaN(distance)) return;
    this.handle.setDistance(distance);
    this.editor.commit();
  }

  dispose(): void {
    this.handle.dispose();
    removeFromPort(PUSH_PULL_PORT_ID);
  }

  private applyDelta(delta: number): void {
    pushPull(this.editor.scene, this.surface, delta);
    this.state$.mutate(s => { s.distance += delta; });
  }
}

function computeCentroid(surface: NurbsSurface): Vec3 {
  let sx = 0, sy = 0, sz = 0, n = 0;
  for (const row of surface.grid) {
    for (const cp of row) {
      sx += cp.position[0];
      sy += cp.position[1];
      sz += cp.position[2];
      n++;
    }
  }
  return [sx / n, sy / n, sz / n];
}

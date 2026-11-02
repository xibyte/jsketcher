/**
 * EntityObject3D — minimal base for every surfacing entity's Three.js view.
 *
 * All hover / selection / highlight state lives on the ENTITY layer now.
 * This base class exists only to give every view class a common Group
 * ancestor and a standard `dispose()` hook called when the owning entity
 * is destroyed.
 */
import {Group} from 'three';

export abstract class EntityObject3D extends Group {

  dispose(): void {
    this.onDispose();
  }

  /** Subclasses release geometries/materials here. */
  protected onDispose(): void {}
}

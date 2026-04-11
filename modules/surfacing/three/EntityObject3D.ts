/**
 * EntityObject3D — base class for every surfacing entity's Three.js view.
 *
 * All per-entity visuals extend this class so callers can uniformly hover,
 * select, and dispose them without knowing the concrete type. Subclasses
 * only need to override the `on…` hooks to react to state changes.
 *
 *   class FooObject3D extends EntityObject3D { ... }
 *   obj.setHover(true);     // calls onHoverChanged(true)
 *   obj.setSelected(true);  // calls onSelectedChanged(true)
 *   obj.dispose();          // calls onDispose()
 */
import {Group} from 'three';

/** Anything that responds to a pointer hover. */
export interface Highlightable {
  setHover(hover: boolean): void;
  readonly hovered: boolean;
}

/** Anything that can be picked and visually marked as selected. */
export interface Selectable {
  setSelected(selected: boolean): void;
  readonly selected: boolean;
  /** Whether this instance can currently be selected at all. */
  isSelectable(): boolean;
}

/** Anything that owns GPU resources and must be released explicitly. */
export interface Disposable {
  dispose(): void;
}

export abstract class EntityObject3D extends Group
  implements Highlightable, Selectable, Disposable {

  protected _hovered = false;
  protected _selected = false;

  get hovered(): boolean { return this._hovered; }
  get selected(): boolean { return this._selected; }

  setHover(hover: boolean): void {
    if (this._hovered === hover) return;
    this._hovered = hover;
    this.onHoverChanged(hover);
  }

  setSelected(selected: boolean): void {
    if (this._selected === selected) return;
    this._selected = selected;
    this.onSelectedChanged(selected);
  }

  /** Override in subclasses that are conditionally selectable. */
  isSelectable(): boolean {
    return true;
  }

  dispose(): void {
    this.onDispose();
  }

  // ---- Hooks to override ----

  /** Called when hover state flips. Subclasses update materials here. */
  protected onHoverChanged(_hovered: boolean): void {}

  /** Called when selection state flips. Subclasses update materials/scale here. */
  protected onSelectedChanged(_selected: boolean): void {}

  /** Called from dispose(). Subclasses release geometries/materials here. */
  protected onDispose(): void {}
}

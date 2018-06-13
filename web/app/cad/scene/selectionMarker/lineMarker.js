import {AbstractSelectionMarker} from "./abstractSelectionMarker";
import {setAttribute, getAttribute} from 'scene/objectData';

export class LineMarker extends AbstractSelectionMarker {

  constructor(context, entity, selectionMaterial) {
    super(context, entity);
    this.selectionMaterial = selectionMaterial;
  }
  
  mark(obj) {
    let line = this.getLine(obj);
    setAttribute(line, 'selection_defaultMaterial', line.material);
    line.material = this.selectionMaterial;
  }

  unMark(obj) {
    let line = this.getLine(obj);
    line.material = getAttribute(line, 'selection_defaultMaterial');
    line.material = this.selectionMaterial;
  }
  
  getLine() {throw 'abstract'}
}
import {AbstractSelectionMarker} from "./abstractSelectionMarker";
import {setAttribute, getAttribute} from 'scene/objectData';

export class LineMarker extends AbstractSelectionMarker {

  constructor(context, entity, selectionMaterial) {
    super(context, entity);
    this.selectionMaterial = selectionMaterial;
  }
  
  mark(obj) {
    setAttribute(obj, 'selection_defaultMaterial', obj.material);
    obj.material = this.selectionMaterial;
  }

  unMark(obj) {
    obj.material = getAttribute(obj, 'selection_defaultMaterial');
    obj.material = this.selectionMaterial;
  }
}
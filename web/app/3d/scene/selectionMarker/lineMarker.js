import {AbstractSelectionMarker} from "./abstractSelectionMarker";
import {setAttribute, getAttribute} from 'scene/objectData';

export class LineMarker extends AbstractSelectionMarker {

  constructor(bus, event, selectionMaterial) {
    super(bus, event);
    this.selectionMaterial = selectionMaterial;
  }
  
  mark(obj) {
    setAttribute(obj, 'selection:defaultMaterial', obj.material);
    obj.material = this.selectionMaterial;
  }

  unMark(obj) {
    obj.material = getAttribute(obj, 'selection:defaultMaterial');
    obj.material = this.selectionMaterial;
  }
}
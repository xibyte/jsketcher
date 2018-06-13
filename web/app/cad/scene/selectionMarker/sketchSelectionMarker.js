import {LineMarker} from './lineMarker';

export class SketchSelectionMarker extends LineMarker {

  constructor(context, selectionMaterial) {
    super(context, 'sketchObject', selectionMaterial);
  }
  
  getLine(obj) {
    return obj.viewObject;
  }
}
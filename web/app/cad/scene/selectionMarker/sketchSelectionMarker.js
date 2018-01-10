import {AbstractSelectionMarker} from "./abstractSelectionMarker";
import {setAttribute} from 'scene/objectData';
import {getAttribute} from "../../../../../modules/scene/objectData";
import {LineMarker} from "./lineMarker";

export class SketchSelectionMarker extends LineMarker {

  constructor(bus, selectionMaterial) {
    super(bus, 'selection_sketchObject', selectionMaterial);
  }
}
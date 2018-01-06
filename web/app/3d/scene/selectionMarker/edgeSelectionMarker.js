import {AbstractSelectionMarker} from "./abstractSelectionMarker";
import {LineMarker} from "./lineMarker";

export class EdgeSelectionMarker extends LineMarker {

  constructor (bus, selectionMaterial) {
    super(bus, 'selection_edge', selectionMaterial);
  }
}
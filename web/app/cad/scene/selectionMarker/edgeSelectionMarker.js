import {AbstractSelectionMarker} from './abstractSelectionMarker';

export class EdgeSelectionMarker extends AbstractSelectionMarker {

  constructor (context) {
    super(context, 'edge');
  }

  mark(obj) {
    obj.marker.material.visible = true;
  }

  unMark(obj) {
    obj.marker.material.visible = false;
  }
}
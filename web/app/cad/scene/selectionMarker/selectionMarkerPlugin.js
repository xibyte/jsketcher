import DPR from 'dpr';
import {SelectionMarker} from './selectionMarker';
import {SketchSelectionMarker} from './sketchSelectionMarker';
import {EdgeSelectionMarker} from './edgeSelectionMarker';
import {createLineMaterial} from 'scene/materials';

export function activate(context) {
  new SelectionMarker(context, 0xFAFAD2, 0xFF0000, null);
  new SketchSelectionMarker(context, createLineMaterial(0xFF0000, 6 / DPR));
  new EdgeSelectionMarker(context, 0xFA8072);
}
  

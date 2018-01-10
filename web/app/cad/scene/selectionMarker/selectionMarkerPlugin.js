import DPR from 'dpr';
import {SelectionMarker} from './selectionMarker';
import {SketchSelectionMarker} from './sketchSelectionMarker';
import {EdgeSelectionMarker} from './edgeSelectionMarker';
import {createLineMaterial} from 'scene/materials';

export function activate(context) {
  let {bus} = context;
  new SelectionMarker(bus, 0xFAFAD2, 0xFF0000, null);
  new SketchSelectionMarker(bus, createLineMaterial(0xFF0000, 6 / DPR));
  new EdgeSelectionMarker(bus, createLineMaterial(0xFA8072, 12 / DPR));
}
  

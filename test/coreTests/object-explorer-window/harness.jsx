// Lightweight real-DOM harness for SketchObjectExplorer. No CAD engine needed.
import React from 'react';
import ReactDOM from 'react-dom';
import {state} from 'lstream';
import {StreamsContext} from '../../../modules/ui/streamsContext';
import {SketcherAppContext} from '../../../web/app/sketcher/components/SketcherAppContext';
import {SketchObjectExplorer} from '../../../web/app/sketcher/components/SketchObjectExplorer';

const selected = [];
const objects = [];
const selection$ = state([]), objects$ = state([]);
const Icon = () => <span aria-hidden="true">•</span>;
const viewer = {
  selected,
  streams: {objects:objects$, selection:selection$},
  refresh() {},
  select(items, exclusive) {
    if (exclusive) selected.splice(0);
    for (const item of items) if (!selected.includes(item)) selected.push(item);
    selection$.next([...selected]);
  },
  deselect(item) {
    const index=selected.indexOf(item);
    if (index >= 0) selected.splice(index, 1);
    selection$.next([...selected]);
  },
};
window.fixture = {
  objects, viewer,
  load(count) {
    objects.splice(0, objects.length, ...Array.from({length:count}, (_,i) => ({
      id:`obj-${i}`, simpleClassName:'Point', role:null, aux:false, icon:Icon,
      get marked() { return selected.includes(this); }
    })));
    selected.splice(0); selection$.next([]); objects$.next([...objects]);
  },
  reorderLastToFirst() { objects.unshift(objects.pop()); objects$.next([...objects]); },
  removeFirst() { objects.shift(); objects$.next([...objects]); },
};
ReactDOM.render(
  <StreamsContext.Provider value={{viewer}}>
    <SketcherAppContext.Provider value={{viewer}}>
      <div style={{height:500,width:'100%',display:'flex',flexDirection:'column'}}><SketchObjectExplorer /></div>
    </SketcherAppContext.Provider>
  </StreamsContext.Provider>, document.getElementById('app'));
window.fixture.load(5000);

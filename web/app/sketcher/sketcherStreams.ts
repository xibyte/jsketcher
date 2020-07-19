import {state, StateStream, Stream, stream} from 'lstream';

export interface SketcherStreams {
  selection: StateStream<any[]>;
  addingRoleMode: StateStream<any>;
  objectsUpdate: StateStream<any>;
  objects: StateStream<any>;
  objectUpdate: Stream<any>;
  dimScale: StateStream<number>;
  tool: { $change: Stream<any>; $message: Stream<any>; $hint: Stream<any> };

}

export default function(viewer): SketcherStreams {
  
  const streams: any = {
  };

  streams.objectsUpdate = stream();
  streams.objects = streams.objectsUpdate.throttle().map(() => {
    let objects = [];
    viewer.layers.forEach(l => l.objects.forEach(o => objects.push(o)));
    return objects;
  }).remember([]);

  streams.addingRoleMode = state(null);
  streams.selection = state([]);
  streams.objectUpdate = stream();
  streams.dimScale = state(1);
  streams.tool = {
    $change: stream(),
    $message: stream(),
    $hint: stream()
  };

  return streams as SketcherStreams;
};
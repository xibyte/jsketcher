import {state, stream} from 'lstream';

export default function(viewer) {
  
  const streams = {};

  streams.objectsUpdate = stream();
  streams.objects = streams.objectsUpdate.throttle().map(() => {
    let objects = [];
    viewer.layers.forEach(l => l.objects.forEach(o => objects.push(o)));
    return objects;
  }).remember([]);

  streams.addingRoleMode = state(null);
  streams.selection = state([]);
  streams.objectUpdate = stream();

  return streams;
};
import {addModification} from './craftHistoryUtils';
import {state, stream} from 'lstream';
import {MShell} from '../model/mshell';

export function activate({streams, services}) {

  streams.craft = {
    modifications: state({
      history: [],
      pointer: -1
    }),
    models: state([]),
    update: stream()
  };

  function modify(request) {
    streams.craft.modifications.update(modifications => addModification(modifications, request));
  }
  
  function reset(modifications) {
    streams.craft.modifications.next({
      history: modifications,
      pointer: modifications.length - 1
    });
  }
  
  services.craft = {
    modify, reset
  };

  streams.craft.modifications.pairwise().attach(([prev, curr]) => {
    let models;
    let beginIndex;
    if (isAdditiveChange(prev, curr)) {
      beginIndex = prev.pointer + 1;
    } else {
      MShell.ID_COUNTER = 0;
      beginIndex = 0;
      streams.craft.models.next([]);
    }
    
    models = new Set(streams.craft.models.value);
    let {history, pointer} = curr;
    for (let i = beginIndex; i <= pointer; i++) {
      let request = history[i];

      let op = services.operation.get(request.type);
      if (!op) {
        console.log(`unknown operation ${request.type}`);
      }

      let {outdated, created} = op.run(request.params, services);

      outdated.forEach(m => models.delete(m));
      created.forEach(m => models.add(m));
      streams.craft.models.next(Array.from(models).sort(m => m.id));
    }
  })
}

function isAdditiveChange({history:oldHistory, pointer:oldPointer}, {history, pointer}) {
  if (pointer < oldPointer) {
    return false;
  }

  for (let i = 0; i <= oldPointer; i++) {
    let modCurr = history[i];
    let modPrev = oldHistory[i];
    if (modCurr !== modPrev) {
      return false;
    }
  }
  return true;
}

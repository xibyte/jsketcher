import {addModification, stepOverriding} from './craftHistoryUtils';
import {state, stream} from 'lstream';
import materializeParams from './materializeParams';
import CadError from '../../utils/errors';
import {MObjectIdGenerator} from '../model/mobject';
import {intercept} from "../../../../modules/lstream/intercept";

export function activate(ctx) {
  const {streams, services} = ctx;
  streams.craft = {

    modifications: state({
      history: [],
      pointer: -1
    }),

    models: state([]),
    update: stream()
  };

  let preRun = null;

  function modifyWithPreRun(request, modificationsUpdater, onAccepted, onError) {

    runRequest(request).then(result => {
      onAccepted();
      preRun = {
        request,
        result
      };
      modificationsUpdater(request);
    }).catch(onError);
  }
  
  function modify(request, onAccepted, onError) {
    modifyWithPreRun(request, 
        request => streams.craft.modifications.update(modifications => addModification(modifications, request)), onAccepted, onError);
  }

  function modifyInHistoryAndStep(request, onAccepted, onError) {
    modifyWithPreRun(request,
      request => streams.craft.modifications.update(modifications => stepOverriding(modifications, request)), onAccepted, onError);
  }

  function reset(modifications) {
    streams.craft.modifications.next({
      history: modifications,
      pointer: modifications.length - 1
    });
  }

  function rebuild() {
    const mods = streams.craft.modifications.value;
    reset([]);
    streams.craft.modifications.next(mods);
  }
  
  function runRequest(request) {
    let op = services.operation.get(request.type);
    if (!op) {
      return Promise.reject(new Error(`unknown operation ${request.type}`));
    }

    let params = {};
    let errors = [];
    materializeParams(services, request.params, op.schema, params, errors);
    if (errors.length) {
      return Promise.reject(new CadError({
        kind: CadError.KIND.INVALID_PARAMS,
        userMessage: errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
      }));
    }

    const result = op.run(params, ctx);
    return result.then ? result : Promise.resolve(result);
  }
  
  function runOrGetPreRunResults(request) {
    if (preRun !== null && preRun.request === request) {
      const result = preRun.result;
      preRun = null;
      return Promise.resolve(result);
    } else {
      return runRequest(request);
    }
  }
  
  services.craft = {
    modify, modifyInHistoryAndStep, reset, runRequest, rebuild,
    historyTravel: historyTravel(streams.craft.modifications)
  };

  let locked = false;
  intercept(streams.craft.modifications, (curr, stream, next) => {
    const prev = stream.value;
    if (locked) {
      console.error('concurrent modification');
    }
    locked = true;
    let models;
    let beginIndex;
    if (isAdditiveChange(prev, curr)) {
      beginIndex = prev.pointer + 1;
    } else {
      MObjectIdGenerator.reset();
      beginIndex = 0;
      streams.craft.models.next([]);
    }
    
    models = new Set(streams.craft.models.value);
    let {history, pointer} = curr;

    function runPromise(i) {
      if (i > pointer) {
        locked = false;
        next(curr);
        return;
      }

      let request = history[i];
      const promise = runOrGetPreRunResults(request)
      promise.then(({consumed, created}) => {

        consumed.forEach(m => models.delete(m));
        created.forEach(m => models.add(m));
        streams.craft.models.next(Array.from(models).sort(m => m.id));

        runPromise(i + 1);
      }).catch(e => {
        locked = false;
        console.error(e);
        //TODO: need to find a way to propagate the error to the wizard.
        next({
          ...curr,
          pointer: i-1
        });
      })
    }
    runPromise(beginIndex);
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

function historyTravel(modifications$) {
  
  return {
    setPointer: function(pointer, hints) {
      let mod = modifications$.value;
      if (pointer >= mod.history.length || pointer < -1) {
        return;
      }
      modifications$.update(({history}) => ({history, pointer, hints}));
    },
    begin: function(hints) {
      this.setPointer(-1, hints);
    },
    end: function(hints) {
      this.setPointer(modifications$.value.history.length - 1, hints);
    },
    forward: function(hints) {
      this.setPointer(modifications$.value.pointer + 1, hints);
    },
    backward: function (hints) {
      this.setPointer(modifications$.value.pointer - 1, hints);
    },
  }

} 


import {addModification, stepOverriding} from './craftHistoryUtils';
import {Emitter, state, StateStream, stream} from 'lstream';
import materializeParams from './materializeParams';
import CadError from '../../utils/errors';
import {MObject, MObjectIdGenerator} from '../model/mobject';
import {intercept} from "lstream/intercept";
import {CoreContext} from "context";
import {MFace} from "../model/mface";

export function activate(ctx: CoreContext) {


  const modifications$ = state({
    history: [],
    pointer: -1
  });

  const models$ = state<MObject[]>([]);
  const update$ = stream<void>();

  models$.attach(models => models.forEach(model => model.traverse(m => {
    if (m instanceof MFace) {
      let sketch = ctx.sketchStorageService.readSketch(m.defaultSketchId);
      m.setSketch(sketch);
    }
  })));

  let preRun = null;

  function modifyWithPreRun(request, modificationsUpdater, onAccepted, onError) {

    runRequest(request).then(result => {
      onAccepted();
      preRun = {
        request,
        result
      };
      modificationsUpdater(request);
    }).catch(error => {
      console.error(error);
      onError(error);
    });
  }
  
  function modify(request, onAccepted, onError) {
    modifyWithPreRun(request, 
        request => modifications$.update(modifications => addModification(modifications, request)), onAccepted, onError);
  }

  function modifyInHistoryAndStep(request, onAccepted, onError) {
    modifyWithPreRun(request,
      request => modifications$.update(modifications => stepOverriding(modifications, request)), onAccepted, onError);
  }

  function reset(modifications: OperationRequest[]) {
    modifications$.next({
      history: modifications,
      pointer: modifications.length - 1
    });
  }

  function rebuild() {
    const mods = modifications$.value;
    reset([]);
    modifications$.next(mods);
  }
  
  function runRequest(request): Promise<OperationResult> {
    try {
      let op = ctx.operationService.get(request.type);
      if (!op) {
        return Promise.reject(new Error(`unknown operation ${request.type}`));
      }

      let params = {};
      let errors = [];
      materializeParams(ctx, request.params, op.schema, params, errors);
      if (errors.length) {
        return Promise.reject(new CadError({
          kind: CadError.KIND.INVALID_PARAMS,
          userMessage: errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
        }));
      }

      const result = op.run(params, ctx);
      // @ts-ignore
      return result.then ? result : Promise.resolve(result);
    } catch (e) {
      return Promise.reject(e);
    }
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

  function isEditingHistory() {
    const mods = this.modifications$.value;
    return mods && mods.pointer !== mods.history.length - 1;
  }

   ctx.craftService  = {
    modify, modifyInHistoryAndStep, reset, rebuild, runRequest, runPipeline,
    historyTravel: historyTravel(modifications$),
    modifications$, models$, update$, isEditingHistory
  };

  // @ts-ignore
  ctx.services.craft = ctx.craftService;
  // @ts-ignore
  ctx.streams.craft = {
    modifications: modifications$,
    models: models$,
    update: update$
  };

  function runPipeline(history: OperationRequest[], beginIndex: number, endIndex: number): Promise<void> {

    const models: Set<MObject> = new Set(models$.value);

    return new Promise((resolve, reject) => {
      function runPromise(i) {
        if (i > endIndex) {
          resolve();
          return;
        }

        const request = history[i];
        const promise = runOrGetPreRunResults(request);
        promise.then(({consumed, created}) => {

          consumed.forEach(m => models.delete(m));
          created.forEach(m => models.add(m));
          models$.next(Array.from(models).sort((m1, m2) => (m1.id||'').localeCompare(m2.id)));

          runPromise(i + 1);
        }).catch(error => {
          reject({
            failIndex: i,
            error
          });
        })
      }
      runPromise(beginIndex);
    });
  }

  let locked = false;

  intercept(modifications$, (curr, stream, next) => {
    if (locked) {
      console.error('[CRAFT] concurrent modification');
    }
    locked = true;

    const prev = stream.value;
    let beginIndex;
    if (isAdditiveChange(prev, curr)) {
      beginIndex = prev.pointer + 1;
    } else {
      MObjectIdGenerator.reset();
      beginIndex = 0;
      models$.next([]);
    }

    let {history, pointer} = curr;

    runPipeline(history, beginIndex, pointer)
      .then(() => next(curr))
      .finally(() => locked = false)
      .catch(reason => {
        console.error(reason.error);
        //TODO: need to find a way to propagate the error to the wizard.
        next({
          ...curr,
          pointer: reason.failIndex
        });
      });
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

export interface OperationRequest {
  type: string;
  params: any;
}

export interface OperationResult {

  consumed: MObject[];
  created: MObject[];

}

interface CraftHistory {
  history: OperationRequest[];
  pointer: number;
}

interface CraftService {

  modifications$: StateStream<CraftHistory>;
  models$: StateStream<MObject[]>;
  update$: Emitter<void>;

  modify(request: OperationRequest, onAccepted: () => void, onError: () => Error);

  modifyInHistoryAndStep(request: OperationRequest, onAccepted: () => void, onError: () => Error);

  reset(modifications: OperationRequest[]);

  rebuild(): void;

  historyTravel: HistoryTravel;

  runRequest(request: OperationRequest): Promise<OperationResult>;

  runPipeline(history: OperationRequest[], beginIndex: number, endIndex: number): Promise<void>;

  isEditingHistory(): boolean;
}

interface HistoryTravel {
  setPointer(pointer, hints:any);
  begin(hints: any);
  end(hints: any);
  forward(hints: any);
  backward(hints: any);
}

declare module 'context' {
  interface CoreContext {

    craftService: CraftService;
  }
}

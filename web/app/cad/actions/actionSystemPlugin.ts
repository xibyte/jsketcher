import {enableAnonymousActionHint} from './anonHint';
import * as stream from 'lstream';
import {state, StateStream, Stream} from 'lstream';
import {LOG_FLAGS} from '../logFlags';
import {CoreContext} from "context";
import {IconType} from "react-icons";

export function activate(context: CoreContext) {
  
  let {streams} = context;


  const appearanceStreams: ActionAppearanceStreams = {};
  const stateStreams: ActionStateStreams = {};
  const hint$: StateStream<Hint> = state(null);

  streams.action = {
    appearance: appearanceStreams,
    state: stateStreams,
    hint: hint$
  };
  
  let runners = {};
  
  let showAnonymousActionHint = enableAnonymousActionHint(context);
  
  function run(id: string, data: any): void {
    let state = streams.action.state[id].value;
    let runner = runners[id];
    if (!state||!runner) {
      console.warn('request to run nonexistent action');
      return;
    } 
    if (state.enabled) {
      if (LOG_FLAGS.ACTION_RUN) {
        console.log("RUNNING ACTION: " + id);
      }
      runner(context, data);
    } else {
      showAnonymousActionHint(id);
    }
  }

  function register(action: ActionDefinition): void {
    streams.action.appearance[action.id] = stream.state(action.appearance);

    runners[action.id] = action.invoke;

    let initialState = {
      hint: '',
      enabled: true,
      visible: true
    };

    let actionStateStream = stream.state(initialState);
    streams.action.state[action.id] = actionStateStream;

    if (action.update && action.listens) {

      action.listens(context).attach(data => {
        actionStateStream.mutate(v => {
          v.hint = '';
          v.enabled = true;
          v.visible = true;
          action.update(v, data, context);
          return v;
        })
      });
    }
  }

  function registerAction(action: ActionDefinition): void {
    register(action);
  }

  function registerActions(actions: ActionDefinition[]): void {
    actions.forEach(action => register(action));
  }

  function showHintFor(request: HintRequest) {
    if (request) {
      let {actionId, x, y, requester} = request;
      let actionState = streams.action.state[actionId].value;
      let actionAppearance = streams.action.appearance[actionId].value;
      if (actionState && actionAppearance) {
        streams.action.hint.value = {
          actionId, x, y, requester,
          info: actionAppearance.info,
          hint: actionState.hint
        };
      }
    } else {
      if (streams.action.hint.value !== null) {
        streams.action.hint.value = null;
      }
    }
  }

  context.actionService = {run, registerAction, registerActions, showHintFor, appearanceStreams, stateStreams, hint$};

  context.services.action = context.actionService;
}


export interface ActionAppearanceStreams {
  [actionId: string]: StateStream<ActionAppearance>
}

export interface ActionStateStreams {
  [actionId: string]: StateStream<ActionState>
}

export interface ActionState {
  hint: string,
  enabled: boolean,
  visible: boolean
}

export interface HintRequest {
  actionId: string;
  x: number;
  y: number;
  requester: any;
}

export interface Hint extends HintRequest {
  info: string;
  hint: string;
}

export interface ActionAppearance {
  info: string,
  label: string,
  icon32?: string,
  icon96?: string,
  icon?: IconType
}

export interface ActionDefinition<T = void> {
  id: string,
  appearance: ActionAppearance,
  invoke: (ApplicationContext, any) => void;
  update?: (ActionState, T, ApplicationContext) => void;
  listens?: (ApplicationContext) => Stream<T>;
}

export interface ActionService {

  run(id: string, data: any): void;
  registerAction(action: ActionDefinition): void;
  registerActions(actions: ActionDefinition[]): void;
  showHintFor(request: HintRequest): void;

  appearanceStreams: ActionAppearanceStreams;
  stateStreams: ActionStateStreams;
  hint$: StateStream<Hint>;
}

declare module 'context' {
  interface CoreContext {

    actionService: ActionService;
  }
}


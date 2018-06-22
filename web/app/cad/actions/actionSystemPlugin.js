import {enableAnonymousActionHint} from './anonHint';
import * as stream from 'lstream';

export function activate(context) {
  
  let {bus, streams} = context;
  
  streams.action = {
    appearance: {},
    state: {},
    hint: stream.state(null)
  }; 
  
  let runners = {};
  
  let showAnonymousActionHint = enableAnonymousActionHint(context);
  
  function run(id, data) {
    let state = streams.action.state[id].value;
    let runner = runners[id];
    if (!state||!runner) {
      console.warn('request to run nonexistent action')
      return;
    } 
    if (state.enabled) {
      runner(context, data);
    } else {
      showAnonymousActionHint(id);
    }
  }

  function register(action) {
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

      action.listens(streams).attach(data => {
        actionStateStream.mutate(v => {
          v.hint = '';
          v.enabled = true;
          v.visible = true;
          action.update(v, data, context)
          return v;
        })
      });
    }
  }

  function registerAction(action) {
    register(action);
  }

  function registerActions(actions) {
    actions.forEach(action => register(action));
  }

  function showHintFor(request) {
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

  context.services.action = {run, registerAction, registerActions, showHintFor}
}



import {createToken} from 'bus';

export function activate(context) {
  
  let {bus} = context;
  
  function run(id, data) {
    bus.dispatch(TOKENS.actionRun(id), data);
  }

  function register(action) {
    bus.enableState(TOKENS.actionAppearance(action.id), action.appearance);

    let stateToken = TOKENS.actionState(action.id);
    let initialState = {
      hint: '',
      enabled: true,
      visible: true
    };
    if (action.update) {
      action.update(initialState, context);
    }
    bus.enableState(stateToken, initialState);
    
    if (action.update && action.listens) {

      const stateUpdater = () => {
        bus.updateState(stateToken, (actionState) => {
          actionState.hint = '';
          actionState.enabled = true;
          actionState.visible = true;
          action.update(actionState, context);
          return actionState;
        });
      };

      for (let event of action.listens) {
        bus.subscribe(event, stateUpdater);
      }
    }
    bus.subscribe(TOKENS.actionRun(action.id), (data) => action.invoke(context, data));
  }

  bus.enableState(TOKENS.HINT, null);
  function registerAction(action) {
    register(action);
  }

  function registerActions(actions) {
    actions.forEach(action => register(action));
  }
  
  synchActionHint(bus);
  
  context.services.action = {run, registerAction, registerActions}
}



function synchActionHint(bus) {
  
  let lastRequest = null;
  
  // bus.subscribe(TOKENS.REQUEST_SHOW_HINT_FOR
  bus.subscribe(TOKENS.SHOW_HINT_FOR, request => {
    if (lastRequest !== null) {
      if (request !== null) {
        if (request[0] === lastRequest[0]) {
          Object.assign(lastRequest, request);
          return;
        }
      }
      lastRequest.spoiled = true;
    }
    lastRequest = request;
    if (request) {
      setTimeout(() => {
        if (!request.spoiled) {
          let [actionId, x, y] = request;
          let actionState = bus.getState(TOKENS.actionState(actionId));
          let actionAppearance = bus.getState(TOKENS.actionAppearance(actionId));
          if (actionState && actionAppearance) {
            bus.dispatch(TOKENS.HINT, {
              actionId, x: x + 10, y: y + 10,
              info: actionAppearance.info,
              hint: actionState.hint
            });
          }
        }
      }, 500);
    } else {
      bus.dispatch(TOKENS.HINT, null);
    }
  });
}

export const ACTION_NS = 'action';
export const TOKENS = {
  actionState: (actionId) => createToken(ACTION_NS, 'state', actionId),
  actionAppearance: (actionId) => createToken(ACTION_NS, 'appearance', actionId),
  actionRun: (actionId) => createToken(ACTION_NS, 'run', actionId),

  SHOW_HINT_FOR: createToken(ACTION_NS, 'showHintFor'),
  HINT: createToken(ACTION_NS, 'hint'),
};
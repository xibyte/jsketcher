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
  
  function registerAction(action) {
    register(action);
  }

  function registerActions(actions) {
    actions.forEach(action => register(action));
  }

  context.services.action = {run, registerAction, registerActions}
}

export const TOKENS = {
  ACTION_STATE_NS: 'action.state',
  ACTION_APPEARANCE_NS: 'action.appearance',
  ACTION_RUN_NS: 'action.run',
  
  actionState: (actionId) => createToken(TOKENS.ACTION_STATE_NS, actionId),
  actionAppearance: (actionId) => createToken(TOKENS.ACTION_APPEARANCE_NS, actionId),
  actionRun: (actionId) => createToken(TOKENS.ACTION_RUN_NS, actionId),
};
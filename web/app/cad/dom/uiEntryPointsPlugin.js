import {createToken} from 'bus';


export function activate({bus}) {

  bus.enableState(TOKENS.CONTROL_BAR_LEFT, []);
  bus.enableState(TOKENS.CONTROL_BAR_RIGHT, []);

  bus.enableState(TOKENS.TOOLBAR_BAR_LEFT, []);
  bus.enableState(TOKENS.TOOLBAR_BAR_LEFT_SECONDARY, []);
  bus.enableState(TOKENS.TOOLBAR_BAR_RIGHT, []);
  
}

const NS = 'ui.config';
  
export const TOKENS = {
  CONTROL_BAR_LEFT: createToken(NS, 'controlBar.left'),
  CONTROL_BAR_RIGHT: createToken(NS, 'controlBar.right'),
  
  TOOLBAR_BAR_LEFT: createToken(NS, 'toolbar.left'),
  TOOLBAR_BAR_LEFT_SECONDARY: createToken(NS, 'toolbar.left.secondary'),
  TOOLBAR_BAR_RIGHT: createToken(NS, 'toolbar.right'),
};


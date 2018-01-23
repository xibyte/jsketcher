import {createToken} from 'bus';

export function activate({bus, services}) {

  bus.enableState(TOKENS.WIZARDS, []);
  bus.subscribe(TOKENS.OPEN, ({type, initialState, overridingHistory}) => {
    
    let wizard = {
      type,
      initialState,
      overridingHistory,
    };
    
    bus.updateState(TOKENS.WIZARDS, opened => [...opened, wizard])
  });
  
  bus.subscribe(TOKENS.CLOSE, wizard => {
    bus.updateState(TOKENS.WIZARDS, opened => opened.filter(w => w === wizard));
  });
} 

export const TOKENS = {
  WIZARDS: createToken('wizards'),
  OPEN: createToken('wizards', 'open'),
  CLOSE: createToken('wizards', 'close'),
};

export const CURRENT_SELECTION = {};

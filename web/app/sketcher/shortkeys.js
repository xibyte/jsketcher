import {keymap} from './keymaps/default'
import Mousetrap from 'mousetrap';
import {getSketcherActionIndex} from "./actions";

export function initShortkeys(ctx) {

  for (const action of Object.keys(keymap)) {
    Mousetrap.bind(keymap[action], e =>{
      e.preventDefault();//prevent the browser to execute it's keyboard handlers.
    
       getSketcherActionIndex()[action].invoke(ctx,e);
    
    });
  }
}

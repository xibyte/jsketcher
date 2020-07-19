import {keymap} from './keymaps/default'
import Mousetrap from 'mousetrap';
import {getSketcherActionIndex} from "./actions";

export function initShortkeys() {

  for (let action of Object.keys(keymap)) {
    Mousetrap.bind(keymap[action], e => getSketcherActionIndex()[action].invoke(e));
  }
}

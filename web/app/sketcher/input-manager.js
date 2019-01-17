import {keymap} from './keymaps/default'
import Mousetrap from 'mousetrap';

export function InputManager(app) {
  this.app = app;
  this.keymap = keymap;
  
  for (let action of Object.keys(keymap)) {
    Mousetrap.bind(keymap[action], e => this.app.actions[action].action(e));
  }
}

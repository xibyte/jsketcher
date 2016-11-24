import {keymap} from './keymaps/default'
import {jwerty} from 'jwerty'

export function InputManager(app) {
  this.app = app;
  this.keymap = keymap;
  $(() => {
    $(document)
      .on('keydown', (e) => this.handleKeyPress(e))
  });
}

InputManager.prototype.handleKeyPress = function(e) {
  switch (e.keyCode) {
    //case 27 : this.clear(); break;
  }

  for (let action in this.keymap) {
    if (jwerty.is(this.keymap[action], e)) {
      setTimeout(() => this.app.actions[action].action(e), 0);
      break;
    }
  }
};


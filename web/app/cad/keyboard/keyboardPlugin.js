import Mousetrap from 'mousetrap';
import DefaultKeymap from './keymaps/default';
import {isMenuAction} from '../dom/menu/menuPlugin';
import {state} from 'lstream';

export function activate({services, streams}) {
  streams.ui.keymap = state(DefaultKeymap);
  let keymap = DefaultKeymap;
  //to attach to a dom element: Mousetrap(domElement).bind(...
  for (let action of Object.keys(keymap)) {
    const dataProvider = getDataProvider(action, services);
    Mousetrap.bind(keymap[action], () => services.action.run(action, dataProvider ? dataProvider() : undefined));
  }
  Mousetrap.bind('esc', services.menu.closeAll)
}

function getDataProvider(action, services) {
  if (isMenuAction(action)) {
    return function() {
      let {left, top, width, height} = services.dom.viewerContainer.getBoundingClientRect();
      return {
        x: left + width * 0.5,
        y: top + height * 0.5,
        centered: true
      }      
    }
  }
  return null;
}



import Mousetrap from 'mousetrap';
import DefaultKeymap from './keymaps/default';

import {createToken} from "bus";
import {TOKENS as ACTION_TOKENS} from "../actions/actionSystemPlugin";
import {isMenuAction, TOKENS as MENU_TOKENS} from "../dom/menu/menuPlugin";

export function activate({bus, services}) {
  bus.enableState(TOKENS.KEYMAP, DefaultKeymap);
  
  let keymap = DefaultKeymap;
  //to attach to a dom element: Mousetrap(domElement).bind(...
  for (let action of Object.keys(keymap)) {
    const dataProvider = getDataProvider(action, services);
    let actionToken = ACTION_TOKENS.actionRun(action);
    Mousetrap.bind(keymap[action], () => bus.dispatch(actionToken, dataProvider ? dataProvider() : undefined));
  }
  Mousetrap.bind('esc', () => bus.dispatch(MENU_TOKENS.CLOSE_ALL));
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


export const TOKENS = {
  KEYMAP: createToken('keymap')
};
import DefaultKeymap from './keymaps/default';

import {createToken} from "../../../../modules/bus/index";

export function activate({bus}) {
  bus.enableState(TOKENS.KEYMAP, DefaultKeymap);
}

export const TOKENS = {
  KEYMAP: createToken('keymap')
};
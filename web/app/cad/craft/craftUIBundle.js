import {state} from 'lstream';
import {EMPTY_OBJECT} from 'gems/objects';

export const BundleName = "@CraftUI";

export function activate({streams}) {
  streams.ui.craft = {
    modificationSelection: state(EMPTY_OBJECT)
  }
}


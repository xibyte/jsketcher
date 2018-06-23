import {state} from 'lstream';

export function activate({streams}) {

  streams.ui = {
    controlBars: {
      left: state([]),
      right: state([])
    },
    toolbars: {
      left: state([]),
      leftSecondary: state([]),
      right: state([])
    }
  };

}



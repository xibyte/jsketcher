import {state} from 'lstream';

export function activate({bus, streams}) {

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



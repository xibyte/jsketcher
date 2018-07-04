import {state} from 'lstream';

export function activate({streams}) {

  streams.ui = {
    controlBars: {
      left: state([]),
      right: state([])
    },
    toolbars: {
      headsUp: state([]),
      auxiliary: state([])
    }
  };

}



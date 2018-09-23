import {state} from 'lstream';

export function activate({streams}) {

  streams.ui = {
    controlBars: {
      left: state([]),
      right: state([])
    },
    toolbars: {
      headsUp: state([]),
      auxiliary: state([]),
      sketcherGeneral: state([]),
      sketcherConstraints: state([]),
      sketcherControl: state([]),
      sketcherToolbarsVisible: state(false)
    },
  };

}



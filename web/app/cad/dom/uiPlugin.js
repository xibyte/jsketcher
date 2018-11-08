import {state} from 'lstream';

export function defineStreams({streams}) {

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
    sockets: {}
  };

}

export function activate({services}) {
  
  let components = new Map();
  const registerComponent = (id, Component) => components.set(id, Component);
  const getComponent = id => components.get(id);
  
  services.ui = {
    registerComponent, getComponent
  }
}

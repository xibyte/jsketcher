import {state} from 'lstream';

export function defineStreams({streams}) {

  streams.ui = {
    controlBars: {
      left: state([]),
      right: state([])
    },
    toolbars: {
      headsUp: state([]),
      headsUpShowTitles: state(true),
      headsUpQuickActions: state([]),
      sketcherGeneral: state([]),
      sketcherConstraints: state([]),
      sketcherControl: state([])
    },
    floatViews: state([]),
    sockets: {}
  };

}

export function activate({streams, services}) {
  
  let components = new Map();
  const registerComponent = (id, Component) => components.set(id, Component);
  const getComponent = id => components.get(id);
  
  let floatViewDescriptors = new Map();
  
  function registerFloatView(id, Component, title, icon) {
    floatViewDescriptors.set(id, {Component, title, icon});
    streams.ui.floatViews.mutate(views => views.push(id));
  }
  const getFloatView = id => floatViewDescriptors.get(id);
  
  services.ui = {
    registerComponent, getComponent, registerFloatView, getFloatView
  }
}

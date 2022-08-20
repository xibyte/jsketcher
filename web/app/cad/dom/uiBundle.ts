import {state, StateStream} from 'lstream';

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

export function activate(ctx) {

  const {streams, services} = ctx;

  const components = new Map();
  const registerComponent = (id, Component) => components.set(id, Component);
  const getComponent = id => components.get(id);
  
  const floatViewDescriptors = new Map();
  
  function registerFloatView(id, Component, title, icon) {
    floatViewDescriptors.set(id, {Component, title, icon});
    streams.ui.floatViews.mutate(views => views.push(id));
  }
  const getFloatView = id => floatViewDescriptors.get(id);
  
  services.ui = {
    registerComponent, getComponent, registerFloatView, getFloatView
  }

  ctx.uiService = {
    ...services.ui,
    streams: ctx.streams.ui
  }
}

export type ActionRef = (string | string[])[];

export interface UIBundleContext {

  uiService: {
    registerFloatView(id: string, Component: any, title: string, icon: any);
    registerComponent(id: string, Component: any);
    getComponent(id: string) : any;
    getFloatView(id: string) : any;
    streams: {
      controlBars: {
        left: StateStream<ActionRef>
        right: StateStream<ActionRef>
      },
      toolbars: {
        headsUp: StateStream<ActionRef>,
        headsUpShowTitles: StateStream<boolean>,
        headsUpQuickActions: StateStream<ActionRef>,
        sketcherGeneral: StateStream<ActionRef>,
        sketcherConstraints: StateStream<ActionRef>,
        sketcherControl: StateStream<ActionRef>
      },
      floatViews: StateStream<ActionRef>,
      sockets: any
    }
  };
}

export const BundleName = "@UI";

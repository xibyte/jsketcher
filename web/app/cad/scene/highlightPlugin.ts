import {Plugin} from "plugable/pluginSystem";
import {combine, stream} from "lstream";
import Viewer from "cad/scene/viewer";

export class HighlightService {

  highlightEvents = stream<string>();
  unHighlightEvents = stream<string>();

  constructor(viewer: Viewer) {
    combine(this.highlightEvents, this.unHighlightEvents)
      .throttle()
      .attach(() => viewer.requestRender())
  }

  highlight(id: string) {
    this.highlightEvents.next(id);
  }

  unHighlight(id: string) {
    this.unHighlightEvents.next(id);
  }

}

interface HighlightPluginInputContext {
  viewer: Viewer;
}

export interface HighlightPluginContext {
  highlightService: HighlightService;
}

type HighlightPluginWorkingContext = HighlightPluginInputContext&HighlightPluginContext;

declare module 'context' {
  interface ApplicationContext extends HighlightPluginContext {}
}

export const HighlightPlugin: Plugin<HighlightPluginInputContext, HighlightPluginContext, HighlightPluginWorkingContext> = {

  inputContextSpec: {
    viewer: 'required',
  },

  outputContextSpec: {
    highlightService: 'required',
  },

  activate(ctx: HighlightPluginWorkingContext) {
    ctx.highlightService = new HighlightService(ctx.viewer);
  },

}



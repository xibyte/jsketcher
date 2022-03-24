import {Plugin} from "plugable/pluginSystem";
import {combine, merge, Stream, stream} from "lstream";
import Viewer from "cad/scene/viewer";
import {ScanStream} from "lstream/scan";

export class HighlightService {

  highlightEvents = stream<string>();
  unHighlightEvents = stream<string>();
  highlighted$: Stream<Set<string>>;

  constructor(viewer: Viewer) {
    combine(this.highlightEvents, this.unHighlightEvents)
      .throttle()
      .attach(() => viewer.requestRender())

    this.highlighted$ = merge(
      this.highlightEvents.map(id => ({type: '+', id})),
      this.unHighlightEvents.map(id => ({type: '-', id})),
    ).scan(new Set<string>(), (highlight, event) => {
      switch (event.type) {
        case '+': {
          highlight.add(event.id);
          break;
        }
        case '-': {
          highlight.delete(event.id);
          break;
        }
        default: throw 'illegal state'
      }
      return highlight;
    })
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



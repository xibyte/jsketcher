import {Bundle} from "bundler/bundleSystem";
import {combine, merge, Stream, stream} from "lstream";
import Viewer from "cad/scene/viewer";

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

interface HighlightBundleInputContext {
  viewer: Viewer;
}

export interface HighlightBundleContext {
  highlightService: HighlightService;
}

type HighlightBundleWorkingContext = HighlightBundleInputContext&HighlightBundleContext;

export const HighlightBundle: Bundle<HighlightBundleWorkingContext> = {

  activate(ctx: HighlightBundleWorkingContext) {
    ctx.highlightService = new HighlightService(ctx.viewer);
  },

  BundleName: "@Highlight",
}



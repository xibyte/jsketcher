import {createFunctionList} from "gems/func";
import {createIndex} from "gems/indexed";

const MarkerTable = [
  {
    type: 'selection',
    priority: 10,
      colors: [0xffff80],
  },
  {
    type: 'highlight',
    priority: 1,
    colors: [0xffebcd, 0xffdf00],
  },
];

export class View {

  static SUPPRESS_HIGHLIGHTS = false

  static MARKER = 'ModelView';

  disposers = createFunctionList();

  constructor(ctx, model, parent, markerTable = MarkerTable) {
    this.ctx = ctx;
    this.model = model;
    this.parent = parent;
    model.ext.view = this;
    this.marks = [];
    this.markerTable = createIndex(markerTable, i => i.type);

    if (!parent) {
      const attrStream = ctx.attributesService.streams.get(model.id);
      this.addDisposer(attrStream.attach(attrs => {
        if (this.rootGroup) {
          this.rootGroup.visible = !attrs.hidden
          ctx.viewer.requestRender();
        }
      }));
    }
  }

  setColor(color) {
    this.color = color;
    this.updateVisuals();
  }

  get markColor() {
    if (View.SUPPRESS_HIGHLIGHTS) {
      return null;
    }
    if (this.marks.length !== 0) {
      const baseMark = this.marks[0];
      return baseMark.colors[Math.min(baseMark.colors.length, this.marks.length) - 1];
    } else {
      return null;
    }
  }

  setVisible(value) {
  }

  mark(type = 'selection') {
    const marker = this.markerTable[type];
    const found = this.marks.find(c => c.type === marker.type);
    if (found) {
      return;
    }
    this.marks.push(marker);
    this.marks.sort((c1, c2) => c1.priority - c2.priority);
    this.updateVisuals();
  }

  withdraw(type) {
    this.marks = this.marks.filter(c => c.type !== type)
    this.updateVisuals();
  }

  updateVisuals() {
  }

  traverse(visitor, includeSelf = true) {
    if (includeSelf) {
      visitor(this);
    }
  }

  addDisposer(disposer) {
    this.disposers.add(disposer);
  }

  dispose() {
    this.disposers.call();
    this.model.ext.view = null;
    this.model = null;
  }

  get isDisposed() {
    return this.model === null;
  }
}


export const MarkTracker = ViewClass => class extends ViewClass {
  
  constructor(ctx, model) {
    super(ctx, model);
    this.marks = new Map();
  }

  mark(color, priority) {
    this.marks.set(priority, color);
    this.doMark();
  }

  withdraw(priority) {
    this.marks.delete(priority);
    this.doMark();
  }
  
  doMark() {
    const keys = this.marks.keys();
    let maxPriority = - Number.MAX_VALUE; 
    for (const key of keys) {
      if (key > maxPriority) {
        maxPriority = key; 
      }
    }
    const color = this.marks.get(maxPriority);
    if (color !== undefined) {
      this.markImpl(color)
    } else {
      this.withdrawImpl(color)
    }
  }

  markImpl(color) {}

  withdrawImpl(color) {}
};
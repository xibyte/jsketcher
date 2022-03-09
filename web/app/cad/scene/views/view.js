import {createFunctionList} from "gems/func";
import {Color} from "three";

export class View {
  
  static MARKER = 'ModelView';

  disposers = createFunctionList();
  color = new Color();

  constructor(model) {
    this.model = model;
    model.ext.view = this;
  }

  setVisible(value) {
  }

  mark(color, priority) {
  }

  withdraw(priority) {
  }

  setColor(color) {
    if (!color) {
      this.color = new Color();
    } else {
      this.color.setStyle(color);
    }
  }

  traverse(visitor) {
    visitor(this);
  }

  addDisposer(disposer) {
    this.disposers.add(disposer);
  }

  dispose() {
    this.disposers.call();
    this.model.ext.view = null;
    this.model = null;
  };
}


export const MarkTracker = ViewClass => class extends ViewClass {
  
  constructor(model) {
    super(model);
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
    let keys = this.marks.keys();
    let maxPriority = - Number.MAX_VALUE; 
    for (let key of keys) {
      if (key > maxPriority) {
        maxPriority = key; 
      }
    }
    let color = this.marks.get(maxPriority);
    if (color !== undefined) {
      this.markImpl(color)
    } else {
      this.withdrawImpl(color)
    }
  }

  markImpl(color) {}

  withdrawImpl(color) {}
};
export class View {
  
  static MARKER = 'ModelView';
  
  constructor(model) {
    this.model = model;
    model.ext.view = this;
  }

  setVisible(value) {
  }

  mark(color) {
    
  }

  withdraw() {
  }
  
  dispose() {
    this.model.ext.view = null;
    this.model = null;
  };
}


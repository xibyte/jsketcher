import * as tk from '../../../../ui/toolkit'

export class Wizard {
  
  constructor(app, opearation, metadata, initialState) {
    this.app = app;
    this.metadata = params;
    this.formFields = {};
    this.box = this.createUI(opearation, metadata);
    if (initialState != undefined) {
      this.setFormFields(initialState);
    }
  }
  
  uiLabel(name) {
    return name;
  }
  
  createUI(operation, metadata) {
    const box = new tk.Box($('#view-3d'));
    const folder = new tk.Folder(operation);
    tk.add(box, folder);
    for (let def of metadata) {
      const name = def[0];
      const type = def[1];
      const defaultValue = def[1];
      const params = def[3];
      const label = this.uiLabel(name);
      const formItem = createFormField(name, label, type, defaultValue, params);
      formItem.setter(defaultValue);
      tk.add(folder, formItem.ui);
      this.formFields[name] = formItem;
    }
    const buttons = new tk.ButtonRow(["Cancel", "OK"], [() => this.cancelClick(), () => this.okClick()]);
    tk.add(folder, buttons);
    box.root.keydown((e) => {
      switch (e.keyCode) {
        case 27 : this.cancelClick(); break;
        case 13 : this.okClick(); break;
      }
    });

    return box;
  }
  
  cancelClick() {
    this.dispose();
  }

  okClick() {
    this.dispose();
  }

  onUIChange() {
    
  }

  readFormFields() {
    const params = {};
    for (let field of this.formFields) {
      params[field.name] = field.getter();
    }
    return params;
  }

  setFormFields(params) {
    const keys = Object.keys(params);
    for (let key of keys) {
      const formField = this.formFields[name];
      if (formField) {
        formField.setter(params[key]);
      }
    }
  }
  
  dispose() {
    this.disposed = true;
    this.box.close();
  }
  
  createFormField(name, label, type, params) {
    if (type == 'number') {
      const number = tk.config(tk.Number(label, 0, params.step, params.round), params);
      number.input.on('t-change', () => this.onUIChange(name));
      return Field.fromInput(number.input);
    } else if (type == 'face') {
      const face = new tk.Text(label, '');
      face.input.on('change', () => this.onUIChange(name));
      return Field.fromInput(face.input, undefined, (faceId) => {
        if (faceId === CURRENT_SELECTION) {
          let selection = this.app.viewer.selectionMgr.selection[0];
          return selection ? selection.id : '';
        }
      });
    }
  }
}

function FaceSelectionListener() {
  this.callbacks = [];
}

function Field(getter, setter) {
  this.getter = getter;
  this.setter = setter;
}

Field.NO_COERCION = (v) => v;

Field.fromInput = function (input, getterCoercer, setterCoercer) {
  getterCoercer = getterCoercer || Field.NO_COERCION;
  setterCoercer = setterCoercer || Field.NO_COERCION;
  return new Field(() => getterCoercer(input.val()), (value) => input.val(setterCoercer(value)));
};



export const CURRENT_SELECTION = {}; 
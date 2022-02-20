import React from 'react';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Stack from 'ui/components/Stack';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';
import {FlattenPath, ParamsPath, ParamsPathSegment, WizardContext} from "cad/craft/wizard/wizardTypes";
import {flattenPath, OperationParamValue} from "cad/craft/schema/schema";

export const FormContext: React.Context<FormContextData> = React.createContext(null);

export class FormContextData  {

  wizardContext: WizardContext;
  prefix: ParamsPath;

  constructor(wizardContext: WizardContext, prefix: ParamsPath) {
    this.wizardContext = wizardContext;
    this.prefix = prefix;
  }

  updateParam(segment: ParamsPathSegment, value: OperationParamValue): void {
    this.wizardContext.updateParam([...this.prefix, segment], value);
  }

  readParam(segment: ParamsPathSegment): OperationParamValue {
    return this.wizardContext.readParam([...this.prefix, segment]);
  }

  dot(segment: ParamsPathSegment): FormContextData {
    return new FormContextData(this.wizardContext, [...this.prefix, segment]);
  }

  setActiveParam = (path: FlattenPath) => {
    this.wizardContext.updateState(state => state.activeParam = path);
  }

  get activeParam(): FlattenPath {
    return this.wizardContext.state$.value.activeParam;
  }
}

export function Group({children}) {
  return <Stack>
    {children}
  </Stack>;
}

export function formField(Control) {
  return function FormPrimitive({label, name, active, setActive, ...props}) {
    return <Field active={active} name={name} onFocus={setActive} onClick={setActive}>
      <Label>{label || camelCaseSplitToStr(name)}</Label>
      <Control {...props} />
    </Field>;
  }
}

interface FormFieldProps {
  name: ParamsPathSegment,
  defaultValue: OperationParamValue,
  label: string,
  children?: any
}

export function attachToForm(Control) {
  return function FormField({name, ...props}: FormFieldProps) {
    return <FormContext.Consumer>
      {
        (ctx: FormContextData) => {
          const fullPath = flattenPath([...ctx.prefix, name]);
          const onChange = val => ctx.updateParam(name, val);
          const setActive = val => ctx.setActiveParam(val ? fullPath : undefined);
          return <React.Fragment>
            <Control value={ctx.readParam(name)}
                     onChange={onChange} 
                     name={name} {...props}
                     setActive={setActive}
                     active={ctx.activeParam === fullPath} />
          </React.Fragment>;
        }
      }
    </FormContext.Consumer>;
  };
}

export function SubForm(props: {name: ParamsPathSegment, children: any}) {

  return <FormContext.Consumer>
    {
      (ctx: FormContextData) => {
        return <FormContext.Provider value={ctx.dot(props.name)}>
          {props.children}
        </FormContext.Provider>
      }
    }
  </FormContext.Consumer>
}
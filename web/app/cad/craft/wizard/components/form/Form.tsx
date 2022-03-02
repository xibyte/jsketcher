import React, {useContext} from 'react';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Stack from 'ui/components/Stack';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';
import {ParamsPath, ParamsPathSegment, WizardState} from "cad/craft/wizard/wizardTypes";
import {OperationParams, OperationParamValue} from "cad/craft/schema/schema";
import {AppContext} from "cad/dom/components/AppContext";
import _ from "lodash";

export const FormStateContext: React.Context<WizardState> = React.createContext(null);
export const FormParamsContext: React.Context<OperationParams> = React.createContext(null);
export const FormPathContext: React.Context<ParamsPath> = React.createContext([]);


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

export function attachToForm(Control): any {

  return function FormField({name, ...props}: FormFieldProps) {

    const ctx = useContext(AppContext);
    const formPath = useContext(FormPathContext);
    const formState = useContext(FormStateContext);
    const params = useContext(FormParamsContext);

    const fullPath = [...formPath, name];
    const fullPathFlatten = fullPath.join('.');
    const onChange = value => ctx.wizardService.updateParam(fullPath, value);
    const setActive = (isActive) => ctx.wizardService.updateState(state => {
      state.activeParam = isActive ? fullPathFlatten : null;
    });

    const value = _.get(params, fullPath);

    return <React.Fragment>
      <Control value={value}
               onChange={onChange}
               name={name} {...props}
               setActive={setActive}
               active={formState.activeParam === fullPathFlatten} />
    </React.Fragment>;
  };
}

export function SubForm(props: {name: ParamsPathSegment, children: any}) {

  const formState = useContext(FormStateContext);
  const formPath = useContext(FormPathContext);

  return <FormParamsContext.Provider value={formState[props.name]}>
    <FormPathContext.Provider value={[...formPath, props.name]}>
      {props.children}
    </FormPathContext.Provider>
  </FormParamsContext.Provider>;
}
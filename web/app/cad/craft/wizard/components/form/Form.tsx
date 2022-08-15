import React, {useContext} from 'react';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Stack from 'ui/components/Stack';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';
import {ParamsPath, ParamsPathSegment, WizardState} from "cad/craft/wizard/wizardTypes";
import {flattenPath, OperationParams, OperationParamValue} from "cad/craft/schema/schema";

interface FormEdit {
  onChange: any;
  setActive: any
}

export const FormStateContext: React.Context<WizardState> = React.createContext(null);
export const FormParamsContext: React.Context<OperationParams> = React.createContext(null);
export const FormPathContext: React.Context<ParamsPath> = React.createContext([]);
export const FormEditContext: React.Context<FormEdit> = React.createContext(null);


export function Group({children}) {
  return <Stack>
    {children}
  </Stack>;
}

export function formField(Control) {
  return function FormPrimitive({label, name, active, setActive, ...props}) {
    return <Field active={active} name={name} onClick={setActive}>
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

    const formPath = useContext(FormPathContext);
    const formState = useContext(FormStateContext);
    const params = useContext(FormParamsContext);
    const formEdit = useContext(FormEditContext);

    const fullPath = [...formPath, name];
    const fullPathFlatten = flattenPath(fullPath);

    const onChange = value => {
      formEdit.onChange(fullPath, value);
      setActive(true);
    }
    const setActive = (isActive) => formEdit.setActive(fullPathFlatten, isActive);

    const value = params[name];

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

  const formParams = useContext(FormParamsContext);
  const formPath = useContext(FormPathContext);

  return <FormParamsContext.Provider value={formParams[props.name]||{} as any}>
    <FormPathContext.Provider value={[...formPath, props.name]}>
      {props.children}
    </FormPathContext.Provider>
  </FormParamsContext.Provider>;
}
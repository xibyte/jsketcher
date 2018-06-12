import React from 'react';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Stack from 'ui/components/Stack';

export const FormContext = React.createContext({});

export function Group({children}) {
  return <Stack>
    {children}
  </Stack>;
}

export function formField(Control) {
  return function FormPrimitive({label, name, ...props}) {
    return <Field>
      <Label>{label || name}</Label>
      <Control {...props} />
    </Field>;
  }
}

export function attachToForm(Control) {
  return function FormField({name, label, defaultValue, ...props}) {
    return <FormContext.Consumer>
      {
        ctx => {
          const onChange = val => {
            ctx.data[name] = val;
            ctx.onChange();
          };
          let dataValue = ctx.data[name];
          let initValue = dataValue === undefined ? defaultValue : dataValue;
          return <React.Fragment>
            <ValueInitializer name={name} data={ctx.data} value={initValue} />
            <Control initValue={initValue} onChange={onChange} name={name} {...props} />
          </React.Fragment>;
        }
      }
    </FormContext.Consumer>;
  };
}

export class ValueInitializer extends React.Component {
  
  componentDidMount() {
    let {name, data, value} = this.props;
    data[name] = value;
  }
  
  render() {
    return null;
  }
}

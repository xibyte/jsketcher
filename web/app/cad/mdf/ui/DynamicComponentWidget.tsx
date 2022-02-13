import React from 'react';

import {ComponentLibrary, DynamicComponents} from "cad/mdf/ui/componentRegistry";
import {DynamicWidgetProps} from "cad/mdf/ui/uiDefinition";


export function DynamicComponentWidget(props: DynamicWidgetProps) {
  const ToRender = DynamicComponents[props.type];
  if (!ToRender) {
    const uiDefinitionTemplate = ComponentLibrary[props.type];
    if (uiDefinitionTemplate) {
      const uiDefinition = uiDefinitionTemplate(props);
      return <DynamicComponentWidget {...uiDefinition} />
    }
    return <span>Unknown component: {props.type}</span>
  }
  return <ToRender {...props}/>
  // return function DynamicUI() {
  //   return <Group>
  //     {Object.keys(schema).map(key => {
  //
  //       const fieldDef: SchemaField = schema[key];
  //       const label = fieldDef.label || key;
  //
  //       if (fieldDef.type === 'number') {
  //         return <NumberField name={key} defaultValue={fieldDef.defaultValue} label={label} />
  //       } else if (fieldDef.type === 'string') {
  //         if (fieldDef.enum) {
  //           return <ComboBoxField name={key} label={label}>
  //             {fieldDef.enum.map(opt => <ComboBoxOption key={opt.value} value={opt.value}>
  //               {opt.label}
  //             </ComboBoxOption>)}
  //           </ComboBoxField>
  //         } else {
  //           return <TextField name={key} label={label} />;
  //         }
  //       } else if (['face', 'edge', 'sketchObject', 'datumAxis'].includes(fieldDef.type)) {
  //         return <Entity name={key} label={label} />;
  //       } else if (fieldDef.type === 'boolean') {
  //         return <CheckboxField name={key} label={label} />;
  //       } else {
  //         return "I don't know";
  //       }
  //
  //     })}
  //   </Group>;
  // };
}
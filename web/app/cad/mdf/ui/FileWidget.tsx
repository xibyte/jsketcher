import {FileField} from "cad/craft/wizard/components/form/Fields";
import React from "react";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {Types} from "cad/craft/schema/types";

export interface FileWidgetProps extends FieldBasicProps {

  type: 'file';

}

export function FileWidget(props: FileWidgetProps) {
  return <FileField name={props.name} label={props.label} />
}

FileWidget.propsToSchema = (props: FileWidgetProps) => {
  return {
    type: Types.object,
    schema: {
      fileName: {
        type: 'string'
      },
      content: {
        type: 'string'
      }
    },
    ...fieldToSchemaGeneric(props),
  }
};



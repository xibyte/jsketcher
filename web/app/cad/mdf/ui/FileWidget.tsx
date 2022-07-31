import {FileField} from "cad/craft/wizard/components/form/Fields";
import React from "react";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {Types} from "cad/craft/schema/types";
import {LocalFile, LocalFileAdapter} from "ui/components/controls/FileControl";
import {ValueResolver} from "cad/craft/schema/schema";

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
      dataUrl: {
        type: 'string'
      }
    },
    ...fieldToSchemaGeneric(props),

    resolve: chainResolver(
      (ctx, localFile: LocalFile) => new LocalFileAdapter(localFile),
      props.resolve
    )
  }
};

function chainResolver(...resolvers: ValueResolver<any, any>[]): ValueResolver<any, any> {

  return (ctx, value, md, reportH) => {
    let updatedValue = value;
    resolvers.forEach(resolver => {
      if (resolver) {
        updatedValue = resolver(ctx, updatedValue, md, reportH);
      }
    });
    return updatedValue;
  }
}

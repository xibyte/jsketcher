import React from "react";

import Entity from "cad/craft/wizard/components/form/EntityList";
import {EntityType} from "cad/craft/schema/types/entityType";
import {OperationSchema, SchemaField} from "cad/craft/schema/schema";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {EntityKind} from "cad/model/entities";
import {ArrayType, ArrayTypeSchema} from "cad/craft/schema/types/arrayType";
import {Types} from "cad/craft/schema/types";


export interface SelectionWidgetProps extends FieldBasicProps {

  type: 'selection';

  multi?: boolean;

  capture: EntityKind[];

  min?: number;

  max?: number;
}

export function SelectionWidget(props: SelectionWidgetProps) {
  return <Entity name={props.name} label={props.label} />;
}

SelectionWidget.propsToSchema = (consumer: OperationSchema, props: SelectionWidgetProps) => {

  let value = {
    type: Types.entity,
    allowedKinds: props.capture,
    initializeBySelection: true,
    ...fieldToSchemaGeneric(props),
  } as SchemaField;

  if (props.multi) {
    const items = value;
    value = {
      type: Types.array,
      min: props.min,
      max: props.max,
      items
    } as ArrayTypeSchema;
  }
  return value;
};



import React from "react";
import {OperationSchema} from "cad/craft/schema/schema";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {Types} from "cad/craft/schema/types";
import {EntityKind} from "cad/model/entities";
import {SectionWidgetProps} from "cad/mdf/ui/SectionWidget";
import {DynamicComponentWidget} from "cad/mdf/ui/DynamicComponentWidget";
import {VectorResolver} from "cad/craft/schema/resolvers/vectorResolver";

export interface BooleanWidgetProps extends FieldBasicProps {

  type: 'boolean';

}

const ENTITY_CAPTURE = [EntityKind.SHELL];

const BOOLEAN_OPTIONS = ['NONE', 'UNION', 'SUBTRACT', 'INTERSECT'];

const BooleanUIDefinition = (fieldName: string, label: string) => ({

  type: 'section',

  title: label,

  collapsible: true,

  initialCollapse: false,

  content: [
    {
      name: fieldName+"/kind",
      label: 'kind',
      type: "choice",
      optional: true,
      values: BOOLEAN_OPTIONS
    },
    {
      name: fieldName+"/targets",
      label: 'target',
      type: "selection",
      capture: ENTITY_CAPTURE,
      multi: true,
      optional: true,
    }
  ]
} as SectionWidgetProps);


export function BooleanWidget(props: BooleanWidgetProps) {

  let vectorUIDefinition = BooleanUIDefinition(props.name, props.label);

  return <DynamicComponentWidget {...vectorUIDefinition} />
}

BooleanWidget.propsToSchema = (consumer: OperationSchema, props: BooleanWidgetProps) => {
  return {
    type: Types.object,
    schema: {
      kind: {
        label: 'kind',
        type: Types.string,
        enum: BOOLEAN_OPTIONS,
        defaultValue: props.defaultValue || 'NONE',
        optional: false
      },

      targets: {
        label: 'targets',
        type: Types.array,
        items: {
          type: Types.entity,
          allowedKinds: ENTITY_CAPTURE,
        },
        optional: true,
        applicable: 'kind !== "NONE"'
      }
    },
    ...fieldToSchemaGeneric(props),
  }
};



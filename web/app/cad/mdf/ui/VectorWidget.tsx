import React from "react";
import {OperationSchema} from "cad/craft/schema/schema";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {Types} from "cad/craft/schema/types";
import {EntityKind} from "cad/model/entities";
import {SectionWidgetProps} from "cad/mdf/ui/SectionWidget";
import {DynamicComponentWidget} from "cad/mdf/ui/DynamicComponentWidget";
import {VectorResolver} from "cad/craft/schema/resolvers/vectorResolver";

export interface VectorWidgetProps extends FieldBasicProps {

  type: 'vector';

}

const ENTITY_CAPTURE = [EntityKind.EDGE, EntityKind.SKETCH_OBJECT, EntityKind.DATUM_AXIS, EntityKind.FACE];

const VectorUIDefinition = (fieldName: string, label: string) => ({

  type: 'section',

  title: label,

  collapsible: true,

  initialCollapse: false,

  content: [
    {
      name: fieldName+"/vectorEntity",
      label: 'vector',
      type: "selection",
      capture: ENTITY_CAPTURE,
      multi: false,
    },
    {
      name: fieldName+"/flip",
      label: 'flip',
      type: "checkbox",
      defaultValue: false
    }
  ]
} as SectionWidgetProps);


export function VectorWidget(props: VectorWidgetProps) {

  let vectorUIDefinition = VectorUIDefinition(props.name, props.label);

  return <DynamicComponentWidget {...vectorUIDefinition} />
}

VectorWidget.propsToSchema = (consumer: OperationSchema, props: VectorWidgetProps) => {
  return {
    type: Types.object,
    schema: {
      vectorEntity: {
        label: 'vector',
        type: Types.entity,
        allowedKinds: ENTITY_CAPTURE,
        optional: true
      },
      flip: {
        label: 'flip',
        type: Types.boolean,
        defaultValue: false,
        optional: false
      }
    },
    resolve: VectorResolver,
    ...fieldToSchemaGeneric(props),
  }
};



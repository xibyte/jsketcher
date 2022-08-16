import React from "react";
import {OperationParamsErrorReporter, ValueResolver} from "cad/craft/schema/schema";
import {FieldBasicProps} from "cad/mdf/ui/field";
import {EntityKind} from "cad/model/entities";
import {SectionWidgetProps} from "cad/mdf/ui/SectionWidget";
import {MObject} from "cad/model/mobject";
import Axis from "math/axis";
import {ApplicationContext} from "cad/context";
import {ObjectTypeSchema} from "cad/craft/schema/types/objectType";

export interface AxisInput {
  vectorEntity: MObject,
  flip: boolean
}

export const AxisResolver: ValueResolver<AxisInput, Axis> = (ctx: ApplicationContext,
                                                             value: AxisInput,
                                                             md: ObjectTypeSchema,
                                                             reportError: OperationParamsErrorReporter): Axis => {

  if (!value.vectorEntity) {
    return null;
  }

  const axis = value.vectorEntity.toAxis(value.flip);
  if (!axis) {
    reportError('unsupported entity type: ' + value.vectorEntity.TYPE);
    return null;
  }
  return axis;
}


export interface AxisBasedWidgetProps extends FieldBasicProps {

  resolve?: ValueResolver<AxisInput, any>;
}

export interface AxisWidgetProps extends FieldBasicProps {

  type: 'axis';

}

const ENTITY_CAPTURE = [EntityKind.EDGE, EntityKind.SKETCH_OBJECT, EntityKind.DATUM_AXIS, EntityKind.FACE];

export const AxisWidgetDefinition = (props: AxisWidgetProps) => AxisBasedWidgetDefinition({
  resolve: AxisResolver,
  ...props,
});

export const AxisBasedWidgetDefinition = (props: AxisBasedWidgetProps) => ({

  type: 'section',

  title: props.label || props.name,

  collapsible: true,

  initialCollapse: false,

  content: [
    {
      type: 'sub-form',
      name: props.name,
      resolve: props.resolve,
      optional: props.optional,
      content: [
        {
          name: "vectorEntity",
          label: 'vector',
          type: "selection",
          capture: ENTITY_CAPTURE,
          multi: false,
          optional: true
        },
        {
          name: "flip",
          label: 'flip',
          type: "checkbox",
          defaultValue: false
        }
      ]
    },
  ]
} as SectionWidgetProps);


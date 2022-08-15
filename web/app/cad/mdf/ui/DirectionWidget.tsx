import React from "react";
import {OperationParamsErrorReporter, ValueResolver} from "cad/craft/schema/schema";
import {ApplicationContext} from "cad/context";
import {ObjectTypeSchema} from "cad/craft/schema/types/objectType";
import {AxisBasedWidgetDefinition, AxisBasedWidgetProps, AxisInput, AxisResolver} from "cad/mdf/ui/AxisWidget";
import {UnitVector} from "math/vector";

export const DirectionResolver: ValueResolver<AxisInput, UnitVector> = (ctx: ApplicationContext,
                                                                        value: AxisInput,
                                                                        md: ObjectTypeSchema,
                                                                        reportError: OperationParamsErrorReporter): UnitVector => {

  return AxisResolver(ctx, value, md, reportError)?.direction;
}

export interface DirectionWidgetProps extends AxisBasedWidgetProps {

  type: 'direction';

}

export const DirectionWidgetDefinition = (props: DirectionWidgetProps) => AxisBasedWidgetDefinition({
  resolve: DirectionResolver,
  ...props,
});

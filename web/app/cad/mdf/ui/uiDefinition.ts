import {NumberWidgetProps} from "cad/mdf/ui/NumberWidget";
import {SelectionWidgetProps} from "cad/mdf/ui/SelectionWidget";
import {AccordionWidgetProps} from "cad/mdf/ui/AccordionWidget";
import {DynamicComponents} from "cad/mdf/ui/componentRegistry";
import {ContainerWidgetProps} from "cad/mdf/ui/ContainerWidget";

export type FieldWidgetProps = NumberWidgetProps | SelectionWidgetProps;

export type BasicWidgetProps = ContainerWidgetProps | AccordionWidgetProps;

export type DynamicWidgetProps = FieldWidgetProps | BasicWidgetProps;

export type UIDefinition = DynamicWidgetProps;

export type FormDefinition = DynamicWidgetProps[];


export function isContainerWidgetProps(comp: DynamicWidgetProps): comp is ContainerWidgetProps {
  return (comp as ContainerWidgetProps).content !== undefined;
}

export function isFieldWidgetProps(comp: DynamicWidgetProps): comp is FieldWidgetProps {
  return DynamicComponents[comp.type].propsToSchema !== undefined;
}

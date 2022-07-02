import {NumberWidgetProps} from "cad/mdf/ui/NumberWidget";
import {SelectionWidgetProps} from "cad/mdf/ui/SelectionWidget";
import {SectionWidgetProps} from "cad/mdf/ui/SectionWidget";
import {DynamicComponents} from "cad/mdf/ui/componentRegistry";
import {ContainerWidgetProps} from "cad/mdf/ui/ContainerWidget";
import {GroupWidgetProps} from "cad/mdf/ui/GroupWidget";
import {CheckboxWidgetProps} from "cad/mdf/ui/CheckboxWidget";
import {AxisWidgetProps} from "cad/mdf/ui/AxisWidget";
import {BooleanWidgetProps} from "cad/mdf/ui/BooleanWidget";
import {ChoiceWidgetProps} from "cad/mdf/ui/ChoiceWidget";
import {SubFormWidgetProps} from "cad/mdf/ui/SubFormWidget";
import {DirectionWidgetProps} from "cad/mdf/ui/DirectionWidget";
import {FileWidgetProps} from "cad/mdf/ui/FileWidget";

export type FieldWidgetProps = NumberWidgetProps | CheckboxWidgetProps | ChoiceWidgetProps | SelectionWidgetProps
  | AxisWidgetProps | DirectionWidgetProps | BooleanWidgetProps | FileWidgetProps;

export type BasicWidgetProps = ContainerWidgetProps | SectionWidgetProps | GroupWidgetProps | SubFormWidgetProps;

export type DynamicWidgetProps = FieldWidgetProps | BasicWidgetProps;

export type UIDefinition = DynamicWidgetProps;

export type FormDefinition = DynamicWidgetProps[];


export function isContainerWidgetProps(comp: DynamicWidgetProps): comp is ContainerWidgetProps {
  return (comp as ContainerWidgetProps).content !== undefined;
}

export function isFieldWidgetProps(comp: DynamicWidgetProps): comp is FieldWidgetProps {
  return DynamicComponents[comp.type].propsToSchema !== undefined;
}

export function isSubFormWidgetProps(comp: DynamicWidgetProps): comp is SubFormWidgetProps {
  return (comp as SubFormWidgetProps).type == 'sub-form';
}

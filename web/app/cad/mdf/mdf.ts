import {IconDeclaration} from "cad/icons/IconDeclaration";
import {CoreContext} from "context";
import {IconType} from "react-icons";
import {OperationResult} from "../craft/craftPlugin";
import {OperationDescriptor} from "../craft/operationPlugin";
import {resolveMDFIcon} from "./mdfIconResolver";
import {OperationSchema} from "cad/craft/schema/schema";
import {
  DynamicWidgetProps,
  FieldWidgetProps,
  FormDefinition,
  isContainerWidgetProps,
  isFieldWidgetProps, isSubFormWidgetProps,
  UIDefinition
} from "cad/mdf/ui/uiDefinition";
import {uiDefinitionToReact} from "cad/mdf/ui/render";
import {ComponentLibrary, DynamicComponents} from "cad/mdf/ui/componentRegistry";

export interface MDFCommand<R> {
  id: string;
  label: string;
  info: string;
  icon: IconType | IconDeclaration;
  run: (request: R, opContext: CoreContext) => OperationResult | Promise<OperationResult>;
  paramsInfo: (params: R) => string,
  mutualExclusiveFields?: string[],
  form: FormDefinition
}


export function loadMDFCommand<R>(mdfCommand: MDFCommand<R>): OperationDescriptor<R> {
  const uiDefinition: UIDefinition = {
    type: 'group',
    content: mdfCommand.form
  }
  const derivedSchema = deriveSchema(uiDefinition);
  return {
    id: mdfCommand.id,
    label: mdfCommand.label,
    icon: resolveMDFIcon(mdfCommand.icon),
    info: mdfCommand.info,
    paramsInfo: mdfCommand.paramsInfo,
    onParamsUpdate: (params, name, value) => {
      if (mdfCommand.mutualExclusiveFields) {
        handleMutualExclusiveFields(mdfCommand.mutualExclusiveFields, params, name, value);
      }
    },
    run: mdfCommand.run,
    // actionParams: {
    //   ...requiresFaceSelection(1)
    // },
    form: uiDefinitionToReact(uiDefinition),
    schema: derivedSchema
  }
}

function traverseUIDefinition(uiDefinition: UIDefinition|UIDefinition[], onField: (comp: FieldWidgetProps) => void) {
  function inorder(comp: DynamicWidgetProps) {

    const libraryItemFn = ComponentLibrary[comp.type];

    if (libraryItemFn) {
      const libraryItem = libraryItemFn(comp);
      inorder(libraryItem)
      return;
    }

    if (isFieldWidgetProps(comp)) {
      onField(comp);
    }

    if (isContainerWidgetProps(comp)) {
      if (!isSubFormWidgetProps(comp)) {
        comp.content.forEach(comp => inorder(comp))
      }
    }
  }

  if (Array.isArray(uiDefinition)) {
    uiDefinition.forEach(def => traverseUIDefinition(def, onField));
  } else {
    inorder(uiDefinition);
  }
}

export function deriveSchema(uiDefinition: UIDefinition): OperationSchema {

  const schema: OperationSchema = {};

  traverseUIDefinition(uiDefinition, (field) => {
    let propsToSchema = DynamicComponents[field.type].propsToSchema;
    let fieldSchema = propsToSchema(field as any, deriveSchema);
    schema[field.name] = fieldSchema;
  });

  return schema;
}


export function handleMutualExclusiveFields(mutualExclusiveFields, params, name, value) {
  if (mutualExclusiveFields.includes(name)) {
    mutualExclusiveFields.forEach(param => {
      if (param !== name) {
        delete params[param];
      }
    })
  }
}
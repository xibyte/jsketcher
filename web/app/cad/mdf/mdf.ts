import {IconDeclaration} from "cad/icons/IconDeclaration";
import {CoreContext} from "context";
import {IconType} from "react-icons";
import {OperationResult} from "../craft/craftPlugin";
import {OperationDescriptor} from "../craft/operationPlugin";
import {resolveMDFIcon} from "./mdfIconResolver";
import {OperationSchema} from "cad/craft/schema/schema";
import {
  DynamicWidgetProps,
  FieldWidgetProps, FormDefinition,
  isContainerWidgetProps,
  isFieldWidgetProps,
  UIDefinition
} from "cad/mdf/ui/uiDefinition";
import {uiDefinitionToReact} from "cad/mdf/ui/render";
import {DynamicComponents} from "cad/mdf/ui/componentRegistry";

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
  const formFields = extractFormFields(uiDefinition);
  const derivedSchema = deriveSchema(formFields);
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
    formFields,
    schema: derivedSchema
  }
}

function extractFormFields(uiDefinition: UIDefinition): FieldWidgetProps[] {

  const fields: FieldWidgetProps[] = [];

  function inorder(comp: DynamicWidgetProps) {

    if (isFieldWidgetProps(comp)) {
      fields.push(comp);
    }

    if (isContainerWidgetProps(comp)) {
      comp.content.forEach(inorder)
    }
  }

  inorder(uiDefinition);

  return fields;
}

export function deriveSchema(formFields: FieldWidgetProps[]): OperationSchema {
  const schema = {};
  formFields.forEach(f => {
    let propsToSchema = DynamicComponents[f.type].propsToSchema;
    schema[f.name] = propsToSchema(schema, f as any);
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
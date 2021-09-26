import { IconDeclaration } from "cad/icons/IconDeclaration";
import { CoreContext } from "context";
import { IconType } from "react-icons";
import { OperationResult } from "../craft/craftPlugin";
import { OperationDescriptor } from "../craft/operationPlugin";
import { generateForm } from "./generateForm";
import { resolveMDFIcon } from "./mdfIconResolver";


interface MDFCommand<R> {
  id: string;
  label: string;
  info: string;
  icon: IconType | IconDeclaration;
  run: (request: R, opContext: CoreContext) => OperationResult | Promise<OperationResult>;
  paramsInfo: (params: R) => string,
  schema: OperationSchema,
  mutualExclusiveFields?: string[]
}

export type Coercable = any;

export type OperationSchema = {
  [key: string]: SchemaField
};

export interface SchemaField {
  type: 'number' | 'boolean' | 'string' | 'face' | 'datumAxis' | 'edge' | 'sketchObject',
  enum?: {
    value: string;
    label: string;    
  }[];
  defaultValue: Coercable,
  optional: boolean,
  label?: string
}

export function loadMDFCommand<R>(mdfCommand: MDFCommand<R>): OperationDescriptor<R> {
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
    form: generateForm(mdfCommand.schema),
    schema: mdfCommand.schema 
  }
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
import React from 'react';
import {state} from 'lstream';
import {IconType} from "react-icons";
import {ActionAppearance} from "../actions/actionSystemPlugin";
import {ApplicationContext, CoreContext} from "context";
import {OperationResult} from "./craftPlugin";
import {OperationFlattenSchema, OperationSchema, schemaIterator} from "cad/craft/schema/schema";
import {FieldWidgetProps, UIDefinition} from "cad/mdf/ui/uiDefinition";

export function activate(ctx: ApplicationContext) {

  const registry$ = state({});

  ctx.streams.operation = {
    registry:registry$
  };
  
  function addOperation(descriptor: OperationDescriptor<any>, actions) {
    let {id, label, info, icon, actionParams} = descriptor;
    let appearance: ActionAppearance = {
      label,
      info
    };
    if (typeof icon === 'string') {
      appearance.icon32 = icon + '32.png';
      appearance.icon96 = icon + '96.png';
    } else {
      appearance.icon = icon;
    }
    let opAction = {
      id: id,
      appearance,
      invoke: () => ctx.services.wizard.open(id),
      ...actionParams
    };
    actions.push(opAction);

    const workingSchema = flattenSchema(descriptor.schema);

    registry$.mutate(registry => registry[id] = Object.assign({appearance, workingSchema}, descriptor, {
      run: (request, opContext) => runOperation(request, descriptor, opContext)
    }));
  }

  function registerOperations(operations) {
    let actions = [];
    for (let op of operations) {
      addOperation(op, actions);
    }
    ctx.actionService.registerActions(actions);
  }

  function get<T>(id: string): Operation<T> {
    let op = registry$.value[id];
    if (!op) {
      throw `operation ${id} is not registered`;
    }
    return op;
  }

  let handlers = [];

  function runOperation(request, descriptor, opContext) {
    for (let handler of handlers) {
      let result = handler(descriptor.id, request, opContext);
      if (result) {
        return result;
      }
    }
    return descriptor.run(request, opContext);
  }

  ctx.operationService = {
    registerOperations,
    get,
    handlers
  };

  ctx.services.operation = ctx.operationService;
}

export interface Operation<R> extends OperationDescriptor<R>{
  appearance: {
    id: string;
    label: string;
    info: string;
    icon32: string;
    icon96: string;
    icon: string|IconType;
  };
  workingSchema: OperationFlattenSchema;
}

export interface OperationDescriptor<R> {
  id: string;
  label: string;
  info: string;
  icon: IconType | string | ((props: any) => JSX.Element);
  actionParams?: any;
  run: (request: R, opContext: CoreContext) => OperationResult | Promise<OperationResult>;
  paramsInfo: (params: R) => string,
  previewGeomProvider?: (params: R) => OperationGeometryProvider,
  form: () => React.ReactNode,
  schema: OperationSchema,
  formFields: FieldWidgetProps[],
  onParamsUpdate?: (params, name, value) => void,
}

export interface OperationService {
  registerOperations(descriptior: OperationDescriptor<any>[]);
  get<T>(operationId: string): Operation<T>;
  handlers: ((
    id: string,
    request: any,
    opContext: CoreContext
  ) => void)[]
}

export interface OperationGeometryProvider {

}

function flattenSchema(schema: OperationSchema): OperationFlattenSchema {
  const flatSchema = {} as OperationFlattenSchema;
  schemaIterator(schema, (path, flattenedPath, schemaField) => {
    flatSchema[flattenedPath] = schemaField;
  });
  return flatSchema;
}

declare module 'context' {
  interface CoreContext {

    operationService: OperationService;
  }
}


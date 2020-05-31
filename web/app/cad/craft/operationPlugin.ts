import React from 'react';
import {state} from 'lstream';
import {IconType} from "react-icons";
import {isEntityType} from './schemaUtils';
import {ActionAppearance} from "../actions/actionSystemPlugin";
import {MObject} from "../model/mobject";
import {ApplicationContext} from "context";

export function activate(context) {
  let {services} = context;

  context.streams.operation = {
    registry: state({})
  };
  
  let registry$ = context.streams.operation.registry;
  
  function addOperation(descriptor, actions) {
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
      invoke: () => services.wizard.open(id),
      ...actionParams
    };
    actions.push(opAction);

    let schemaIndex = createSchemaIndex(descriptor.schema);
    
    registry$.mutate(registry => registry[id] = Object.assign({appearance, schemaIndex}, descriptor, {
      run: (request, opContext) => runOperation(request, descriptor, opContext)
    }));
  }

  function registerOperations(operations) {
    let actions = [];
    for (let op of operations) {
      addOperation(op, actions);
    }
    services.action.registerActions(actions);
  }

  function get(id) {
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

  services.operation = {
    registerOperations,
    get,
    handlers
  };

  context.operationService = services.operation;
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
  schemaIndex: {
    entitiesByType: any;
    entitiesByParam: any;
    entityParams: any[];
    params: any[];
  },
}

function createSchemaIndex(schema) {
  const entitiesByType = {};
  const entitiesByParam = {};
  const entityParams = [];
  for (let field of Object.keys(schema)) {
    let md = schema[field];
    let entityType = md.type === 'array' ? md.itemType : md.type;

    if (isEntityType(entityType)) {
      let byType = entitiesByType[entityType];
      if (!byType) {
        byType = [];
        entitiesByType[entityType] = byType;
      }
      byType.push(field);
      entitiesByParam[field] = entityType;
      entityParams.push(field);
    }
  }
  return {entitiesByType, entitiesByParam,
    entityParams: Object.keys(entitiesByParam),
    params: Object.keys(schema)
  };
}


export interface OperationDescriptor<R> {
  id: string;
  label: string;
  info: string;
  icon: IconType | string;
  actionParams?: any;
  run: (request: R, opContext: OperationContext) => OperationResult;
  paramsInfo: (params: R) => string,
  previewGeomProvider: (params: R) => OperationGeometryProvider,
  form: () => React.ReactNode,
  schema: any
}

export interface OperationService {
  registerOperations(descriptior: OperationDescriptor<any>[]);
  get(operationId: string): Operation<any>;
  handlers: ((
    id: string,
    request: any,
    opContext: OperationContext
  ) => void)[]
}

export interface OperationGeometryProvider {

}

export interface OperationResult {

  consumed: MObject[];
  created: MObject[];

}

export interface OperationContext {
  cadRegistry: any
}

declare module 'context' {
  interface ApplicationContext {

    operationService: OperationService;
  }
}


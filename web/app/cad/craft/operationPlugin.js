import {state} from 'lstream';
import {isEntityType} from './schemaUtils';

export function activate(context) {
  let {services} = context;

  context.streams.operation = {
    registry: state({})
  };
  
  let registry$ = context.streams.operation.registry;
  
  function addOperation(descriptor, actions) {
    let {id, label, info, icon, actionParams} = descriptor;
    let appearance = {
      label,
        info,
        icon32: icon + '32.png',
        icon96: icon + '96.png',
    };
    let opAction = {
      id: id,
      appearance,
      invoke: () => services.wizard.open(id),
      ...actionParams
    };
    actions.push(opAction);

    let schemaIndex = createSchemaIndex(descriptor.schema);
    
    registry$.mutate(registry => registry[id] = Object.assign({appearance, schemaIndex}, descriptor, {
      run: (request, services) => runOperation(request, descriptor, services)
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

  function runOperation(request, descriptor, services) {
    for (let handler of handlers) {
      let result = handler(descriptor.id, request, services);
      if (result) {
        return result;
      }
    }
    return descriptor.run(request, services);
  }
  
  services.operation = {
    registerOperations,
    get,
    handlers
  };
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
import schema from './booleanOpSchema';
import BooleanWizard from './BooleanWizard';

function run(params, services) {
  return services.craftEngine.boolean({
    type: params.type,
    operandsA: [services.cadRegistry.findShell(params.operandA)],
    operandsB: [services.cadRegistry.findShell(params.operandB)]
  });
}

const paramsInfo = ({operandA, operandB}) => `(${operandA}, ${operandB})`;

const selectionMode = {
  shell: true
};

export const intersectionOperation = {
  id: 'INTERSECTION',
  label: 'intersection',
  icon: 'img/cad/intersection',
  info: 'intersection operation on two shells',
  paramsInfo,
  form: BooleanWizard,
  schema: schema('INTERSECTION'),
  run,
  selectionMode 
};

export const subtractOperation = {
  id: 'SUBTRACT',
  label: 'subtract',
  icon: 'img/cad/subtract',
  info: 'subtract operation on two shells',
  paramsInfo,
  form: BooleanWizard,
  schema: schema('SUBTRACT'),
  run,
  selectionMode
};

export const unionOperation = {
  id: 'UNION',
  label: 'union',
  icon: 'img/cad/union',
  info: 'union operation on two shells',
  paramsInfo,
  form: BooleanWizard,
  schema: schema('UNION'),
  run,
  selectionMode
};

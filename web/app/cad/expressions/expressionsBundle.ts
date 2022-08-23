import {merge, state, StateStream, Stream} from 'lstream';
import {indexArray} from 'gems/iterables';
import {ApplicationContext} from "cad/context";

export const BundleName = "@Expressions";

export function activate(ctx: ApplicationContext) {
  let _evaluateExpression: (string) => any = () => {};

  const script$ = state('');
  const list$ = state([]);
  const table$ = list$.map(varList => indexArray(varList, i => i.name, i => i.value)).remember();
  const synced$ = merge(script$.map(() => false), list$.map(() => true));
  const errors$ = state([]);

  function reevaluateExpressions() {
    const {varList, errors, evaluateExpression} = rebuildVariableTable(script$.value);
    list$.next(varList);
    errors$.next(errors);
    _evaluateExpression = evaluateExpression;
  }

  function load(script) {
    script$.next(script);
    reevaluateExpressions();
  }

  function evaluateExpression(expr) {
    if (typeof expr === 'number') {
      return expr;      
    }
    let value = table$.value[expr];
    if (value === undefined) {
      value = _evaluateExpression(expr);
    }
    return value;
  }


  ctx.actionService.registerAction({
    id: 'expressionsUpdateTable',
    appearance: {
      info: 'reevaluate expression script (happens automatically on script focus lost)',
      label: 'update expressions',
    },
    invoke: ({services}) => {
      services.extension.reevaluateExpressions();
    }
  });

  ctx.expressionService = {
    script$, list$, table$, synced$, errors$,
    reevaluateExpressions, load, evaluateExpression,
    signature: ''
  };

  table$.attach(() => ctx.expressionService.signature = Date.now() + '');

  load('');
}

function rebuildVariableTable(script) {
  const varList = [];
  const errors = [];
  if (script == null) return;
  const lines = script.split('\n');
  let evalContext = "(function() { \n";
  function evaluateExpression(expr) {
    return eval(evalContext + "return " + expr + "; \n})()");
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*([^\s]+)\s*=(.+)$/);
    if (m != null && m.length === 3) {
      const name = m[1];
      try {
        const value = evaluateExpression(m[2]);
        varList.push({name, value});
        evalContext += "const " + name + " = " + value + ";\n"
      } catch (e) {
        errors.push({
          line: i, 
          message: e.message
        });
        console.log(e);
      }
    }
  }
  return {varList, errors, evaluateExpression}; 
}

export interface ExpressionService {

  script$: StateStream<string>;

  list$: StateStream<string[]>,

  table$: Stream<{[key:string]: string}>,

  synced$: Stream<any>,

  errors$: Stream<ExpressionError[]>

  reevaluateExpressions(): void;

  load(script: string):void;

  evaluateExpression(string): any;

  signature: string;
}

export interface ExpressionError {
  message: string;
  line: string;
}

export interface ExpressionBundleContext {

  expressionService: ExpressionService;
}

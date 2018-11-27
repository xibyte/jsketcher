import {state, stream, merge} from 'lstream';
import {indexArray} from '../../../../modules/gems/iterables';
import {NOOP} from '../../../../modules/gems/func';

export function defineStreams(ctx) {
  const script = state('');
  const list = state([]);
  const table = list.map(varList => indexArray(varList, i => i.name, i => i.value)).remember();
  const synced = merge(script.map(() => false), list.map(() => true));
  ctx.streams.expressions = {
    script, list, table, synced,
    errors: state([])
  };
}

export function activate(ctx) {
  let _evaluateExpression = NOOP;
  function reevaluateExpressions() {
    let {varList, errors, evaluateExpression} = rebuildVariableTable(ctx.streams.expressions.script.value);
    ctx.streams.expressions.list.next(varList);
    ctx.streams.expressions.errors.next(errors);
    _evaluateExpression = evaluateExpression;
  }
  function load(script) {
    ctx.streams.expressions.script.next(script);
    reevaluateExpressions();
  }
  function evaluateExpression(expr) {
    if (typeof expr === 'number') {
      return expr;      
    }
    let value = ctx.streams.expressions.table.value[expr];
    if (value === undefined) {
      value = parseFloat(expr);
      if (isNaN(value)) {
        value = _evaluateExpression(expr);
      }
    }
    return value;
  }
  ctx.services.expressions = {
    reevaluateExpressions, load, evaluateExpression
  };
  ctx.services.action.registerAction({
    id: 'expressionsUpdateTable',
    appearance: {
      info: 'reevaluate expression script (happens automatically on script focus lost)',
      label: 'update expressions',
    },
    invoke: ({services}) => {
      services.extension.reevaluateExpressions();
    }
  })
}

function rebuildVariableTable(script) {
  let varList = [];
  let errors = [];
  if (script == null) return;
  let lines = script.split('\n');
  let evalContext = "(function() { \n";
  function evaluateExpression(expr) {
    return eval(evalContext + "return " + expr + "; \n})()");
  }
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let m = line.match(/^\s*([^\s]+)\s*=(.+)$/);
    if (m != null && m.length === 3) {
      let name = m[1];
      try {
        let value = evaluateExpression(m[2]);
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


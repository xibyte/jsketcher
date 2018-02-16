import {createToken} from "bus";
import {addModification} from './craftHistoryUtils';

export function activate({bus, services}) {

  bus.enableState(TOKENS.MODIFICATIONS, {
    history: [],
    pointer: -1
  });

  function isAdditiveChange({history, pointer}, {history:oldHistory, pointer:oldPointer}) {
    if (pointer < oldPointer) {
      return false;
    }
    
    for (let i = 0; i <= oldPointer; i++) {
      let modCurr = history[i];
      let modPrev = oldHistory[i];
      if (modCurr !== modPrev) {
        return false;
      }
    }
    return true;    
  }
  
  bus.subscribe(TOKENS.MODIFICATIONS, (curr, prev) => {
    let beginIndex;
    if (isAdditiveChange(curr, prev)) {
      beginIndex = prev.pointer + 1;
    } else {
      services.cadRegistry.reset();
      beginIndex = 0;
    }
    let {history, pointer} = curr;
    for (let i = beginIndex; i <= pointer; i++) {
      modifyInternal(history[i]);
    }
  });


  function modifyInternal(request) {
    let op = services.operation.registry[request.type];
    if (!op) return `unknown operation ${request.type}`;

    let result = op.run(request.params, services);

    services.cadRegistry.update(result.outdated, result.created);
  }

  function modify(request) {
    bus.updateState(TOKENS.MODIFICATIONS, modifications => addModification(modifications, request));
  }
  
  function reset(modifications) {
    bus.dispatch(TOKENS.MODIFICATIONS, {
      history: modifications,
      pointer: modifications.length - 1
    });
  }
  
  services.craft = {
    modify, reset, TOKENS
  }
}

export const TOKENS = {
  MODIFICATIONS: createToken('craft', 'modifications')
};

import {createToken} from "../../../../modules/bus/index";

export function activate({bus, services}) {

  bus.enableState(TOKENS.MODIFICATIONS, {
    history: [],
    pointer: -1
  });

  function getHistory() {
    return bus.state[TOKENS.MODIFICATIONS].history;
  }

  bus.subscribe(TOKENS.HISTORY_POINTER, (pointer) => {
    let history = getHistory();
    if (pointer < history.length) {
      bus.setState(TOKENS.MODIFICATIONS, {pointer});
      reset(history.slice(0, pointer));
    }
  });

  function remove(modificationIndex) {
    bus.updateState(TOKENS.MODIFICATIONS,
      ({history, pointer}) => {
        let newLength = history.length - modificationIndex;
        return {
          history: history.slice(modificationIndex, newLength),
          pointer: Math.min(pointer, newLength)
        }
      });
  }

  function reset(modifications) {
    services.cadRegistry.reset();
    for (let request of modifications) {
      modifyInternal(request);
    }
  }

  function modifyInternal(request) {
    let op = services.operation.registry[request.type];
    if (!op) return `unknown operation ${request.type}`;

    let result;
    try {
      result = op.run(services.cadRegistry.registry, request.params);
    } catch (err) {
      return err;
    }

    services.cadRegistry.update(result.outdated, result.created);
    return null;
  }

  function modify(request) {
    let errors = modifyInternal(request);
    if (errors !== undefined) {
      // return errors;
      throw 'not implemented, should reported by a wizard';
    }

    bus.updateState(TOKENS.MODIFICATIONS,
      ({history, pointer}) => {
        return {
          history: history.slice(pointer + 1, 0, request),
          pointer: pointer++
        }
      });
  }
  services.craft = {
    modify, remove
  }
}

export const TOKENS = {
  MODIFICATIONS: createToken('craft', 'modifications'),
  HISTORY_POINTER: createToken('craft', 'historyPointer'),
};

import {createToken} from "bus";

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
      resetInternal(history.slice(0, pointer));
      bus.setState(TOKENS.MODIFICATIONS, {pointer});
    }
  });

  function remove(modificationIndex) {
    bus.updateState(TOKENS.MODIFICATIONS,
      ({history, pointer}) => {
        return {
          history: history.slice(0, modificationIndex),
          pointer: Math.min(pointer, modificationIndex - 1)
        }
      });
  }

  function resetInternal(modifications) {
    services.cadRegistry.reset();
    for (let request of modifications) {
      modifyInternal(request);
    }
  }

  function reset(modifications) {
    resetInternal(modifications);
    bus.updateState(TOKENS.MODIFICATIONS,
      () => {
        return {
          history: modifications,
          pointer: modifications.length - 1
        }
      });
  }

  function modifyInternal(request) {
    let op = services.operation.registry[request.type];
    if (!op) return `unknown operation ${request.type}`;

    let result = op.run(request.params, services);

    services.cadRegistry.update(result.outdated, result.created);
  }

  function modify(request) {
    modifyInternal(request);

    bus.updateState(TOKENS.MODIFICATIONS,
      ({history, pointer}) => {
        return {
          history: [...history, request],
          pointer: pointer++
        }
      });
  }

  services.craft = {
    modify, remove, reset, TOKENS
  }
}

export const TOKENS = {
  MODIFICATIONS: createToken('craft', 'modifications'),
  HISTORY_POINTER: createToken('craft', 'historyPointer'),
};

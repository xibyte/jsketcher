
export function addModification({history, pointer}, request) {
  let changingHistory = pointer !== history.length - 1;
  if (changingHistory) {
    history.slice(0, pointer);
    history.push(request);
    return {
      history,
      pointer: ++pointer
    }
  } else {
    return {
      history: [...history, request],
      pointer: ++pointer
    }
  }
}

export function stepOverridingParams({history, pointer}, params) {
  history[pointer + 1] = {
    type: history[pointer + 1].type,
    params
  };
  return {
    history,
    pointer: ++pointer
  };
}

export function finishHistoryEditing({history}) {
  return ({history, pointer: history.length - 1});
}

export function removeAndDropDependants({history}, indexToRemove) {
  history = history.slice(0, indexToRemove);
  return {
    history,
    pointer: history.length - 1
  }
}
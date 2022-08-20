
export function addModification({history, pointer}, request) {
  const changingHistory = pointer !== history.length - 1;
  if (changingHistory) {
    history = [
      ...history.slice(0, pointer+1),
      request,
      ...history.slice(pointer+1)
    ];
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

export function stepOverriding({history, pointer}, request) {
  history[pointer + 1] = request;
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

export function removeFeature({history}, indexToRemove) {
  history = [...history];
  history.splice(indexToRemove, 1);
  return {
    history,
    pointer: history.length - 1
  }
}
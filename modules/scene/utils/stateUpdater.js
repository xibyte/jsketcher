
export function createReactiveState(state = {}, update) {
  
  return function (prop, value) {
    if (state[prop] === value) {
      return;
    }
    state[prop] = value;
    update(state);
  }
}

export function createExpensiveSetter(setter) {
  let lastValue = NOT_SET;
  return function set(value) {
    if (value !== lastValue) {
      lastValue = value;
      setter(value);
    } 
  }
}

const NOT_SET = {};
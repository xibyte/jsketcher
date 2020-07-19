
export const NOT_INITIALIZED = Object.freeze({});

export function propsChangeTracker(props, onChange) {

  const values = props.map(() => NOT_INITIALIZED);
  
  return function(obj) {
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      const prevValue = values[i];
      const currValue = obj[prop];
      if (prevValue !== currValue) {
        onChange(obj, prop, currValue, prevValue);
      }
    }
  }
}
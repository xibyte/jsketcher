export const NOOP = () => {};

export function createFunctionList() {
  const fnList = [];
  const add = fn => fnList.push(fn);
  const call = () => {
    fnList.forEach(fn => {
      try {
        fn(); 
      } catch(e) {
        console.error(e);
      }
    });
  };
  return {
    add, call
  }
}

export function compositeFn() {

  const funcs = [];

  const fn = () => {
    funcs.forEach(fn => fn());
  };

  fn.functionList = funcs;

  function push(fn) {
    if (fn.functionList) {
      fn.functionList.forEach(fn2 => push(fn2));
    } else {
      funcs.push(fn);
    }
  }
  fn.push = push;
  return fn
}

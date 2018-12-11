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
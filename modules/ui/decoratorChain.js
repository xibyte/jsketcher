export default function decoratorChain() {
  let decorators = Array.from(arguments);
  return function(Component) {
    for (let i = decorators.length - 1; i >= 0; i --) {
      Component = decorators[i](Component);
    }
    return Component;
  }
}
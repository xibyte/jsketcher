export function dfs<T>(node:T,
                       children: (node: T, consumer: (node: T) => void) => void,
                       callback: (node) => any): boolean {

  const visited = new Set<T>();

  const stack = [];
  stack.push(node);
  while (stack.length) {
    const node = stack.pop();
    if (visited.has(node)) {
      continue;
    }
    visited.add(node);
    if (callback(node)) {
      return true;
    }
    children(node, child => stack.push(child));
  }
}

export function bfs<T>(node:T,
                       children: (node: T, consumer: (node: T) => void) => void,
                       callback: (node) => any): boolean {

  const visited = new Set<T>();
  const queue = [];
  queue.unshift(node);
  while (queue.length) {
    const node = queue.pop();
    if (visited.has(node)) {
      continue;
    }
    visited.add(node);
    if (callback(node)) {
      return true;
    }
    children(node, child => queue.push(child));
  }
}

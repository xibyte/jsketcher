

export function dfs(node, children, callback) {
  const visited = new Set();
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

export function bfs(node, children, callback) {
  const visited = new Set();
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

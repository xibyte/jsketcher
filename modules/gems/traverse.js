

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
      return;
    }
    children(node, child => stack.push(child));
  }
}


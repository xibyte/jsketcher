// The Manifold runtime only imports node:module in Node. This bundle is for
// browsers; fail clearly if its environment detection ever enters that path.
export function createRequire() {
  throw new Error('Node module loading is unavailable in the browser build.');
}

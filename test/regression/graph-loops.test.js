// Contour graph regression: iteration must not access a later lexical binding.
import {strict as assert} from 'node:assert';
import {Graph} from '../../web/app/utils/graph';
const hash = x => String(x), eq = (a, b) => a === b;
assert.deepEqual(Graph.findAllLoops(new Graph([]), hash, eq), []);
const loops = Graph.findAllLoops(new Graph([[1, 2], [0, 2], [0, 1]]), hash, eq);
assert.equal(loops.length, 1);
assert.deepEqual([...loops[0]].sort(), [0, 1, 2]);
console.log('PASS empty and triangular contour graphs');

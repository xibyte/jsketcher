// Regression for https://github.com/xibyte/jsketcher/pull/216.
import {strict as assert} from 'node:assert';
import {Monomial, ToThePowerFunction} from '../../web/app/sketcher/constr/polynomial';

const fourth = ToThePowerFunction.get(4);
assert.equal(fourth.degree, 4);
assert.equal(fourth.apply(2), 16);
assert.equal(fourth.derivative1(2), 32);

const x = {id: 1, get: () => 2};
for (const [powers, expectedDegree, expectedValue] of [
  [[4, 1], 5, 32],
  [[4, 4], 8, 256],
  [[2, 2, 1], 5, 32],
] as const) {
  const term = new Monomial(1);
  for (const power of powers) term.addParam(x, ToThePowerFunction.get(power));
  term.mergeTerms();
  assert.equal(term.terms.length, 1);
  assert.equal(term.terms[0].fn.degree, expectedDegree);
  assert.equal(term.value(p => p.get()), expectedValue);
}
console.log('PASS fourth-power degree, derivative, and merged polynomial terms');

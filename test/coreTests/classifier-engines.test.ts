import {strict as assert} from 'assert';
import {Classification, NativeClassifier, OCCClassifier} from '../../web/app/cad/craft/production/classifier';

const native = new NativeClassifier();
const nativeFace = {data: {id: 'native-face'}} as any;
assert.equal(native.classifyFaceToFace(nativeFace, nativeFace), Classification.EXACT);
assert.doesNotThrow(() => native.prepare({} as any));

// The OCC classifier must send actual BREP pointers into OCC; a native shell
// without OCC metadata is not silently treated as an OCC operand.
const occ = new OCCClassifier();
assert.throws(() => occ.prepare({data: {}} as any));
assert.doesNotThrow(() => occ.prepare({data: {externals: {ptr: 0}}} as any));
const calls = [];
(globalThis as any).Module = {_ClassifyFaceToFace(a, b, tolerance) { calls.push([a, b, tolerance]); return Classification.EXACT; }};
assert.equal(occ.classifyFaceToFace({data: {externals: {ptr: 123}}} as any, {data: {externals: {ptr: 456}}} as any), Classification.EXACT);
assert.deepEqual(calls, [[123, 456, 0.001]]);
console.log('PASS distinct native and OCC classifiers; OCC receives BREP pointers');

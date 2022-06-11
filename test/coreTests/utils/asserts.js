import {createFailError} from '../test';
import sketchObjectGlobalId from '../../../web/app/cad/sketch/sketchObjectGlobalId';

export function fail(msg, optionalMsg) {
  assert.fail(msg + (optionalMsg === undefined ? '' : ' ' + optionalMsg));
}

export function assertTrue(stmt, msg) {
  if (typeof stmt === 'string') {
    throw 'wrong assertion usage, mixed up arguments';
  }
  if (!stmt) {
    fail('assertTrue fails.', msg);
  }
}

export function assertEmpty(array, msg) {
  if (typeof msg === 'string') {
    throw 'wrong assertion usage, mixed up arguments';
  }
  if (array.length !== 0) {
    fail('assertEmpty fails. Array length = ' + array.length, msg);
  }
}

export function assertFalse(stmt, msg) {
  if (stmt) {
    fail('assertFalse fails.', msg);
  }
}

export function assertEquals(expected, actual, msg) {
  if (expected !== actual) {
    fail('assertEquals: Expected: ' + expected + ' but was ' + actual, msg);
  }
}

export function assertFloatEquals(expected, actual, msg) {
  if (Math.abs(expected - actual) >= 1E-6) {
    fail('assertFloatEquals: Expected: ' + expected + ' but was ' + actual, msg);
  }
}

export function assertPointXY2DEquals(expectedX, expectedY, actual, msg) {
  if (actual.x !== expectedX || actual.y !== expectedY) {
    fail('assertPoint2DEquals: Expected: (' + expectedX + ', ' + expectedY + ') but was (' + actual.x + ', ' + actual.y + ')', msg);
  }
}

export function assertPoint2DEquals(expected, actial, msg) {
  assertPointXY2DEquals(expected.x, expected.y, actial, msg);
}

export function assertFaceIsPlane(face) {
  assertTrue(face.shell.surfacePrototype !== undefined);
}

export function assertFaceOrigination(face, sketchId, primitiveId) {
  assertEquals(sketchObjectGlobalId(sketchId, primitiveId), 
    face.productionInfo.originatingPrimitive);
}

export function assertFaceRole(face, expectedRole) {
  assertEquals(expectedRole, face.productionInfo.role);
}
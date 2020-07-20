import {assertEquals, assertFalse, assertTrue} from '../utils/asserts';
import {NOOP} from 'gems/func';

export const TEST_MODE = 'sketcherUI';

export async function testEqualConstraints(env, ui) {

  ui.addRectangle(10, 10, 100, 100);

  assertEquals(4, ui.viewer.parametricManager.system.subSystems.length);
  assertEquals(4, ui.viewer.parametricManager.system.constraints.length);
  assertEquals(1, ui.viewer.parametricManager.system.subSystems[0].constraints.length);


}

export async function testBuildGraphBasics(env, ui) {

  const seg1 = ui.addSegment(10, 10, 10, 100);
  const seg2 = ui.addSegment(200, 10, 200, 100);
  ui.select([seg1, seg2]);
  ui.runAction('parallelConstraint');
    
  assertEquals(1, ui.viewer.parametricManager.system.subSystems.length);
  assertEquals(1, ui.viewer.parametricManager.system.constraints.length);
  assertEquals(1, ui.viewer.parametricManager.system.subSystems[0].constraints.length);
  
  
  const seg3 = ui.addSegment(500, 10, 500, 100);
  const seg4 = ui.addSegment(700, 10, 700, 100);
  ui.select([seg3, seg4]);
  ui.runAction('parallelConstraint');
  
  assertEquals(2, ui.viewer.parametricManager.system.subSystems.length);
  assertEquals(2, ui.viewer.parametricManager.system.constraints.length);
  assertEquals(1, ui.viewer.parametricManager.system.subSystems[0].constraints.length);
  assertEquals(1, ui.viewer.parametricManager.system.subSystems[1].constraints.length);
  

}

export async function testThreeConnectedConstraints(env, ui) {

  const seg1 = ui.addSegment(10, 10, 10, 100);
  const seg2 = ui.addSegment(200, 10, 200, 100);
  ui.select([seg1, seg2]);
  ui.runAction('parallelConstraint');

  assertEquals(1, ui.viewer.parametricManager.system.subSystems.length);
  assertEquals(1, ui.viewer.parametricManager.system.constraints.length);
  assertEquals(1, ui.viewer.parametricManager.system.subSystems[0].constraints.length);


  const seg3 = ui.addSegment(500, 10, 500, 100);
  const seg4 = ui.addSegment(700, 10, 700, 100);
  ui.select([seg3, seg4]);
  ui.runAction('parallelConstraint');

  assertEquals(2, ui.viewer.parametricManager.system.subSystems.length);
  assertEquals(2, ui.viewer.parametricManager.system.constraints.length);
  assertEquals(1, ui.viewer.parametricManager.system.subSystems[0].constraints.length);
  assertEquals(1, ui.viewer.parametricManager.system.subSystems[1].constraints.length);

  ui.select([seg2, seg3]);
  ui.runAction('parallelConstraint');

  assertEquals(1, ui.viewer.parametricManager.system.subSystems.length);
  assertEquals(3, ui.viewer.parametricManager.system.constraints.length);
  assertEquals(3, ui.viewer.parametricManager.system.subSystems[0].constraints.length);


}

export async function testIgnoreBoundaries(env, ui) {

  const boundary = ui.addSegment(500, 10, 500, 100);
  boundary.aux = true;
  
  const seg1 = ui.addSegment(100, 10, 100, 100);
  ui.select([seg1, boundary]);
  ui.runAction('parallelConstraint');

  const seg2 = ui.addSegment(700, 10, 700, 100);
  ui.select([seg1, boundary]);
  
  ui.select([seg1, boundary]);
  ui.runAction('parallelConstraint');

  assertEquals(1, ui.viewer.parametricManager.system.subSystems.length);
  assertEquals(2, ui.viewer.parametricManager.system.constraints.length);
  assertEquals(2, ui.viewer.parametricManager.system.subSystems[0].constraints.length);


}

export async function testMirroring(env, ui) {

  const seg1 = ui.addSegment(10, 10, 10, 100);
  const seg2 = ui.addSegment(200, 10, 200, 100);
  
  ui.select([seg2, seg1]);
  ui.runAction('mirrorConstraint');
  const seg3 = ui.viewer.parametricManager.system.constraints[0].reflectedObjects[0];
  const seg4 = ui.addSegment(600, 10, 600, 100);
  ui.select([seg4, seg3]);
  ui.runAction('mirrorConstraint');

  let system = ui.viewer.parametricManager.system;
  let subSystems = ui.viewer.parametricManager.system.subSystems;
  assertEquals(3, subSystems.length);
  const subSystem0 = system.constraintToSubSystem.get(system.constraints[0]);
  const subSystem1 = system.constraintToSubSystem.get(system.constraints[1]);
  assertTrue( subSystem1.dependencies[0] === subSystem0, "Second subsystem depends on first one");
  

}

export async function testCircularDependencies(env, ui) {

  const seg1 = ui.addSegment(10, 10, 10, 100);
  const seg2 = ui.addSegment(200, 10, 200, 100);

  ui.select([seg2, seg1]);
  ui.runAction('mirrorConstraint');
  const seg3 = ui.viewer.parametricManager.system.constraints[0].reflectedObjects[0];
  const seg4 = ui.addSegment(600, 10, 600, 100);
  ui.select([seg4, seg3]);
  ui.runAction('mirrorConstraint');

  
  let seg5 = ui.viewer.parametricManager.system.constraints[1].reflectedObjects[0];
  ui.select([seg5, seg1]);
  ui.runAction('parallelConstraint');

  let isCircular = false;
  ui.viewer.parametricManager.system.traverse(NOOP, () => isCircular = true);
  
  assertEquals(2, ui.viewer.parametricManager.system.subSystems.length);
  assertTrue(isCircular, "System should contain circular depending subsystems");


}


export async function testSimpleRemove(env, ui) {

  const seg1 = ui.addSegment(10, 10, 10, 100);
  const seg2 = ui.addSegment(200, 10, 200, 100);
  ui.select([seg1, seg2]);
  ui.runAction('parallelConstraint');

  const seg3 = ui.addSegment(500, 10, 500, 100);
  const seg4 = ui.addSegment(700, 10, 700, 100);
  ui.select([seg3, seg4]);
  ui.runAction('parallelConstraint');


  ui.select([seg2, seg3]);
  ui.runAction('parallelConstraint');

  assertEquals(1, ui.viewer.parametricManager.system.subSystems.length);
  assertEquals(3, ui.viewer.parametricManager.system.constraints.length);
  assertEquals(3, ui.viewer.parametricManager.system.subSystems[0].constraints.length);

  ui.select([]);
  ui.viewer.remove(seg1);

  assertEquals(1, ui.viewer.parametricManager.system.subSystems.length);
  assertEquals(2, ui.viewer.parametricManager.system.constraints.length);


}

export async function testMirroringRemove(env, ui) {

  const seg1 = ui.addSegment(10, 10, 10, 100);
  const seg2 = ui.addSegment(200, 10, 200, 100);

  ui.select([seg2, seg1]);
  ui.runAction('mirrorConstraint');
  const seg3 = ui.viewer.parametricManager.system.constraints[0].reflectedObjects[0];
  const seg4 = ui.addSegment(600, 10, 600, 100);
  ui.select([seg4, seg3]);
  ui.runAction('mirrorConstraint');

  assertEquals(3, ui.viewer.parametricManager.system.subSystems.length);
  ui.viewer.remove(seg1);
  assertEquals(0, ui.viewer.parametricManager.system.subSystems.length);


}

export async function testDoubleAngle(env, ui) {

  const seg1 = ui.addSegment(100, 100, 100, 200);
  const seg2 = ui.addSegment(100, 200, 200, 200);
  const seg3 = ui.addSegment(10, 10, 300, 10);
  
  ui.select([seg3, seg2, seg1]);
  
  ui.runAction('mirrorConstraint');

  const [seg4, seg5] = ui.viewer.parametricManager.system.constraints[1].reflectedObjects;
  const seg6 = ui.addSegment(300, -200, 300, 300);
  
  ui.select([seg6, seg5, seg4, seg2, seg1]);
  
  ui.runAction('mirrorConstraint');

  let isCircular = false;
  ui.viewer.parametricManager.system.traverse(NOOP, () => isCircular = true);

  assertFalse(isCircular, "shouldn't be circular");


}

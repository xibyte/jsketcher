import * as vec from "math/vec";

export let RayCastDebugInfo;

export function initRayCastDebug() {
  RayCastDebugInfo = {};
}

export function printRaycastDebugInfo(tag , hit) {
  if (RayCastDebugInfo && RayCastDebugInfo.ray) {
    const pt = hit.point;
    //generating test data
    const BUFFER = 100;
    const r = vec.fromXYZ(pt).map(Math.round);
    const dir = vec._mul(vec.fromXYZ(RayCastDebugInfo.ray.direction), BUFFER);
    console.log(tag);
    console.log('cy.simulateClickByRayCast(['+ vec.sub(r, dir).map(Math.round).join(', ') + '], [' + vec.add(r, dir).map(Math.round).join(', ') + '])');
  }
}


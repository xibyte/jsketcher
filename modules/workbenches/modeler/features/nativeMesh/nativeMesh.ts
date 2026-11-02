import {MBrepShell} from 'cad/model/mshell';
import {Shell} from 'brep/topo/shell';

// Native mesh topology does not carry OCC pointers and cannot be passed to OCC.
export function requireNativeMesh(value: any): MBrepShell {
  if (!(value instanceof MBrepShell) || !value.brepShell?.data?.__meshWithOrigins) {
    throw new Error('Choose a Native Mesh solid. OCC and native solids cannot be mixed yet.');
  }
  return value;
}

// Rebuilt from the operation history. Keep references stable for unchanged
// topology; this does not promise face identity after topology-changing edits.
export function identifyNativeShell(shell: Shell, featureId: number): MBrepShell {
  if (!Number.isSafeInteger(featureId) || featureId <= 0) throw new Error('A valid feature ID is required.');
  const prefix = `native:${featureId}`;
  shell.faces.forEach((face, i) => {face.data.id = `${prefix}/F:${i}`;});
  Array.from(shell.edges).forEach((edge, i) => {edge.data.id = `${prefix}/E:${i}`;});
  Array.from(shell.vertices).forEach((vertex, i) => {vertex.data.id = `${prefix}/V:${i}`;});
  const model = new MBrepShell(shell);
  model.id = prefix;
  model.faces.forEach((face, i) => {face.id = `${prefix}/F:${i}`;});
  model.edges.forEach((edge, i) => {edge.id = `${prefix}/E:${i}`;});
  model.vertices.forEach((vertex, i) => {vertex.id = `${prefix}/V:${i}`;});
  return model;
}

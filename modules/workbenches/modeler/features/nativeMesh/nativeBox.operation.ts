import {ApplicationContext} from 'cad/context';
import {OperationDescriptor} from 'cad/craft/operationBundle';
import {SketchGeom} from 'cad/sketch/sketchReader';
import {Segment} from 'cad/sketch/sketchModel';
import CSys from 'math/csys';
import Vector from 'math/vector';
import {buildExtrusionMesh} from 'brep/operations/mesh/extrudeMesh';
import {GiCube} from 'react-icons/gi';
import {identifyNativeShell} from './nativeMesh';

interface Params { x: number; y: number; z: number; width: number; depth: number; height: number; featureId: number }

export const NativeMeshBoxOperation: OperationDescriptor<Params> = {
  id: 'NATIVE_MESH_BOX', label: 'Native Mesh Box', icon: GiCube,
  info: 'Experimental native mesh box. Native and OCC solids cannot be mixed.',
  path: __dirname,
  paramsInfo: p => `(${p.width} × ${p.depth} × ${p.height})`,
  form: [
    {type: 'number', name: 'x', label: 'X', defaultValue: 0},
    {type: 'number', name: 'y', label: 'Y', defaultValue: 0},
    {type: 'number', name: 'z', label: 'Z', defaultValue: 0},
    {type: 'number', name: 'width', label: 'Width', defaultValue: 100},
    {type: 'number', name: 'depth', label: 'Depth', defaultValue: 100},
    {type: 'number', name: 'height', label: 'Height', defaultValue: 100},
  ],
  run: (p: Params, ctx: ApplicationContext) => {
    for (const value of [p.x, p.y, p.z, p.width, p.depth, p.height]) {
      if (!Number.isFinite(value) || Math.abs(value) > 1e6) throw new Error('Coordinates and dimensions must be finite and within ±1,000,000.');
    }
    if ([p.width, p.depth, p.height].some(v => v < 0.01)) throw new Error('Each dimension must be at least 0.01.');
    for (const [origin, length] of [[p.x,p.width], [p.y,p.depth], [p.z,p.height]]) {
      const represented = Math.fround(origin + length) - Math.fround(origin);
      if (Math.abs(represented - length) > Math.max(1e-6, length * 1e-4)) {
        throw new Error('This position and dimension exceed the precision of native mesh geometry.');
      }
    }
    const points = [new Vector(p.x,p.y,p.z), new Vector(p.x+p.width,p.y,p.z),
      new Vector(p.x+p.width,p.y+p.depth,p.z), new Vector(p.x,p.y+p.depth,p.z)];
    const sketch = new SketchGeom();
    points.forEach((a, i) => sketch.connections.push(new Segment(`native:${p.featureId}/S:${i}`, a, points[(i+1)%points.length])));
    const profiles = ctx.nativeService.sketchToProfiles(sketch, CSys.ORIGIN);
    if (profiles.length !== 1) throw new Error('Could not construct a closed native box profile.');
    const direction = new Vector(0,0,p.height);
    const shell = ctx.nativeService.extrudeProfile(profiles[0], direction, CSys.ORIGIN);
    const geometry = buildExtrusionMesh(points, direction, new Vector(0,0,1));
    if (shell.faces.length !== 6 || geometry.wallTess.length !== 4) throw new Error('Could not construct native box geometry.');
    const base = shell.faces[4], lid = shell.faces[5], originMap: any = {
      0: {brepFace: base, surface: base.surface}, 1: {brepFace: lid, surface: lid.surface},
    };
    base.data.tessellation = {data: geometry.bottomTess};
    lid.data.tessellation = {data: geometry.topTess};
    for (let i=0; i<4; ++i) {
      const face = shell.faces[i];
      face.data.tessellation = {data: geometry.wallTess[i]};
      originMap[i+2] = {brepFace: face, surface: face.surface};
    }
    shell.data.__meshWithOrigins = {meshData: geometry.meshData, originMap};
    return {consumed: [], created: [identifyNativeShell(shell, p.featureId)]};
  },
};

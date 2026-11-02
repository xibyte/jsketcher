import {ApplicationContext} from 'cad/context';
import {OperationDescriptor} from 'cad/craft/operationBundle';
import {EntityKind} from 'cad/model/entities';
import {MBrepShell} from 'cad/model/mshell';
import {GiCubes} from 'react-icons/gi';
import {identifyNativeShell, requireNativeMesh} from './nativeMesh';

interface Params { target: MBrepShell; tool: MBrepShell; kind: 'UNION' | 'SUBTRACT' | 'INTERSECT'; featureId: number }
export const NativeMeshBooleanOperation: OperationDescriptor<Params> = {
  id: 'NATIVE_MESH_BOOLEAN', label: 'Native Mesh Boolean', icon: GiCubes,
  info: 'Combine two Native Mesh solids. OCC solids cannot be mixed or converted yet.',
  path: __dirname,
  paramsInfo: p => p.kind,
  form: [
    {type: 'selection', name: 'target', capture: [EntityKind.SHELL], label: 'Native target', multi: false, nativeMeshChoices: true},
    {type: 'selection', name: 'tool', capture: [EntityKind.SHELL], label: 'Native tool', multi: false, nativeMeshChoices: true},
    {type: 'choice', name: 'kind', label: 'Operation', style: 'dropdown', defaultValue: 'UNION', values: ['UNION','SUBTRACT','INTERSECT']},
  ],
  run: async (p: Params, ctx: ApplicationContext) => {
    const target = requireNativeMesh(p.target), tool = requireNativeMesh(p.tool);
    if (target === tool || target.id === tool.id) throw new Error('Choose two different Native Mesh solids.');
    if (!['UNION','SUBTRACT','INTERSECT'].includes(p.kind)) throw new Error('Unsupported native Boolean operation.');
    const result = await ctx.nativeService.applyBooleanModifier([tool], {kind:p.kind, targets:[target], simplify:false});
    const produced = result.created[0] as MBrepShell;
    if (!produced || !produced.brepShell || !produced.brepShell.faces.length) throw new Error('This operation produced no solid; the original shapes were kept.');
    return {consumed: result.consumed, created: [identifyNativeShell(produced.brepShell, p.featureId)]};
  },
};

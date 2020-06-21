import {AlgNumConstraint} from "../../sketcher/constr/ANConstraints";
import {AlgNumSubSystem} from "../../sketcher/constr/AlgNumSystem";
import Vector from "math/vector";
import CSys from "math/csys";
import {AssemblyCSysNode, AssemblyNode} from "./assembly";
import {ISolveStage} from "../../sketcher/constr/solvableObject";
import {MObject} from "../model/mobject";
import {MShell} from "../model/mshell";
import {Constraints3D} from "./constraints3d";

export function solveAssembly(constraints: AlgNumConstraint[]) {

  const objects = new Set<AssemblyNode>();

  constraints.forEach(c => c.objects.forEach(o => objects.add(o)));

  const stage: ISolveStage = {
    objects: objects,
    index: 0
  };

  const roots = new Set<MShell>();
  objects.forEach(o => {
    const root = o.model.root;
    if (root instanceof MShell) {
      roots.add(root);
      objects.add(root.assemblyNodes.location)
    }
  });

  objects.forEach(o => {
    o.stage = stage;
    o.reset();
  });

  // const algNumConstraint = new AlgNumConstraint(Constraints3D.FaceParallel, objects);

  const system = new AlgNumSubSystem(() => 0.001, val => val, stage);
  // __DEBUG__.AddNormal(face1.csys.origin, new Vector().set3(objects[0].normal.map(p => p.get())))
  // __DEBUG__.AddNormal(face2.csys.origin, new Vector().set3(objects[1].normal.map(p => p.get())))

  system.startTransaction();
  constraints.forEach(c => system.addConstraint(c));
  objects.forEach(assemblyNode => {
    const internalConstraints = assemblyNode.createConsistencyConstraints();
    internalConstraints.forEach(c => {
      c.internal = true;
      system.addConstraint(c);
    });

    const root = assemblyNode.model.root;
    if (root instanceof MShell) {
      const rigidBodyLinks = assemblyNode.createRigidBodyLink(root.assemblyNodes.location);
      rigidBodyLinks.forEach(c => {
        c.internal = true;
        system.addConstraint(c);
      });
    } else {
      throw 'unsupported: needs location implementation';
    }
  });

  system.prepare();
  system.solveFine();
  system.finishTransaction();

  // __DEBUG__.AddNormal(face1.csys.origin, new Vector().set3(objects[0].normal.map(p => p.get())))
  // __DEBUG__.AddNormal(face2.csys.origin, new Vector().set3(objects[1].normal.map(p => p.get())))

  roots.forEach(root => {
    applyResults(root, root.assemblyNodes.location);
  });

}


function applyResults(shell: MShell, targetCsysParams: AssemblyCSysNode): void {
  const [
    ox, oy, oz, ix, iy, iz, jx, jy, jz, kx, ky, kz
  ] = targetCsysParams.params.map(p => p.get());

  const targetCsys = new CSys(
    new Vector(ox, oy, oz),
    new Vector(ix, iy, iz),
    new Vector(jx, jy, jz),
    new Vector(kx, ky, kz),
  );

  const basis = [
    new Vector(ix, iy, iz),
    new Vector(jx, jy, jz),
    new Vector(kx, ky, kz),
  ];

  // __DEBUG__.AddCSys(shell.csys);
  // __DEBUG__.AddCSys(targetCsys);

  const tr = shell.csys.inTransformation3x3;
  basis.forEach(r => tr._apply(r));

  shell.location$.update(csys => {
    return targetCsys;
  });
  // shell.location$.mutate(csys => {
  //   csys.x = basis[0];
  //   csys.y = basis[1];
  //   csys.z = basis[2];
  //   csys.origin = new Vector(ox, oy, oz)._minus(shell.csys.origin);
  // });

}
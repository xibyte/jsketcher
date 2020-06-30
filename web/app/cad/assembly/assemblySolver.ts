import {AlgNumConstraint} from "../../sketcher/constr/ANConstraints";
import {AlgNumSubSystem, SolveStatus} from "../../sketcher/constr/AlgNumSystem";
import Vector from "math/vector";
import CSys from "math/csys";
import {AssemblyNode} from "./assembly";
import {ISolveStage} from "../../sketcher/constr/solvableObject";
import {MShell} from "../model/mshell";
import {AssemblyCSysNode} from "./nodes/assemblyCSysNode";
import {AssemblyConstraints, AssemblyConstraintSchema, Constraints3D} from "./constraints3d";
import {AssemblyConstraintDefinition} from "./assemblyConstraintDefinition";
import {MObject} from "../model/mobject";
import {CadRegistry} from "../craft/cadRegistryPlugin";

export class RigidBody {

  model: MObject;
  relationships = new Map<RigidBody, AssemblyConstraint[]>();

  reset() {
    this.model.traverse(m => {
      if (m.assemblyNodes) {
        Object.values(m.assemblyNodes).forEach((node: AssemblyNode) => node.reset());
      }
    })
  }
}

export class AssemblyConstraint {
  objects: MObject[] = [];
  schema: AssemblyConstraintSchema;
}

export class AssemblyProcess {

  queue: RigidBody[];
  solved: Set<RigidBody> = new Set();
  solveStatus: SolveStatus = {
    success: true,
    error: 0
  };
  errorStep = null;

  constructor(cadRegistry: CadRegistry, constraintDefs: AssemblyConstraintDefinition[]) {
    this.queue = buildAssemblyQueue(cadRegistry, constraintDefs)
  }

  step() {

    const body = this.queue.pop();
    const constraints = [];
    body.relationships.forEach((overConstraints, bodyBuddy) => {

      if (this.solved.has(bodyBuddy)) {
        overConstraints.forEach(c => constraints.push(c));
      }
    });
    body.reset();

    this.solveStatus = solve(constraints, body.model, true);
    if (!this.solveStatus.success) {
      this.errorStep = body.model.id;
      console.log("Assembly system haven't been solved at the orientation step");
      return;
    }
    // this.solveStatus = solve(constraints, body.model, false);
    // if (!this.solveStatus.success) {
    //   console.log("Assembly system haven't been solved at the translation step");
    //   this.errorStep = body.model.id;
    //   return;
    // }

    applyLocation(body.model as MShell);

    this.solved.add(body);
  }

  isDone(): boolean {
    return this.queue.length === 0;
  }

}


function buildAssemblyQueue(cadRegistry: CadRegistry, constraintDefs: AssemblyConstraintDefinition[]): RigidBody[] {

  const constraints: AssemblyConstraint[] = [];

  constraintDefs.forEach(def => {
    const schema = AssemblyConstraints[def.typeId];
    if (!schema) {
      console.error('reference to nonexistent constraint ' + def.typeId);
      return null;
    }
    const constraint = new AssemblyConstraint();
    constraint.schema = schema;
    const objects = [];
    for (const id of def.objects) {
      const modelObject = cadRegistry.find(id);
      if (!modelObject) {
        console.warn('skipping constraint referring to nonexistent object ' + id);
        return null;
      }
      constraint.objects.push(modelObject);
      objects.push(modelObject);
    }
    constraints.push(constraint);
  });


  const bodies = new Map<MObject, RigidBody>();
  function body(obj: MObject) {
    let rigidBody = bodies.get(obj);
    if (!rigidBody) {
      rigidBody = new RigidBody();
      rigidBody.model = obj;
      bodies.set(obj, rigidBody);
    }
    return rigidBody;
  }

  function link(a: MObject, b: MObject, constr: AssemblyConstraint) {
    const rigidBodyA = body(a);
    const rigidBodyB = body(b);

    let arr = rigidBodyA.relationships.get(rigidBodyB);
    if (!arr) {
      arr = [];
      rigidBodyA.relationships.set(rigidBodyB, arr);
    }
    arr.push(constr)
  }

  constraints.forEach(constr => {
    const roots = new Set<MObject>();
    constr.objects.forEach(o => roots.add(o.root));
    const arr: MObject[] = Array.from(roots);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i+1; j < arr.length; j++) {
        link(arr[i], arr[j], constr);
        link(arr[j], arr[i], constr);
      }
    }
  });

  return Array.from(bodies.values());
}

export function launchAssembly(assemblyProcess: AssemblyProcess): void {

  while (!assemblyProcess.isDone()) {
    assemblyProcess.step();
    if (assemblyProcess.errorStep !== null) {
      break;
    }
  }

}

function addToStage(stage: ISolveStage, object: AssemblyNode) {
  stage.objects.add(object);
  object.stage = stage;
}



function solve(constraints: AssemblyConstraint[], freeBody: MObject, orientation: boolean): SolveStatus {


  if (!(freeBody instanceof MShell)) {
    throw 'unsupported: needs location implementation';
  }

  const readOnlyStage: ISolveStage = {
    objects: new Set<AssemblyNode>(),
    index: 0
  };

  const stage: ISolveStage = {
    objects: new Set<AssemblyNode>(),
    index: 1
  };


  // const assemblyNodes: AssemblyNode  = orientation ? : ;

  const solvingConstraints = [];

  constraints.forEach(c => {
    const nodes = c.schema.defineAssemblyScope(c.objects);

    nodes.forEach(o => {
      if (o.model.root === freeBody) {
        addToStage(stage, o);
      } else {
        addToStage(readOnlyStage, o);
      }
    });

    solvingConstraints.push(new AlgNumConstraint(orientation ? c.schema.orientation : c.schema.translation, nodes));
  });

  addToStage(stage, freeBody.assemblyNodes.location);

  const system = new AlgNumSubSystem(() => 0.001, val => val, stage);
  system.startTransaction();
  solvingConstraints.forEach(c => {
    system.addConstraint(c);
  });
  stage.objects.forEach(solveObject => {
    const assemblyNode = solveObject as AssemblyNode;
    const internalConstraints = assemblyNode.createConsistencyConstraints();
    internalConstraints.forEach(c => {
      c.internal = true;
      system.addConstraint(c);
    });
    if (assemblyNode.model.root === freeBody) {

      const rigidBodyLinks = orientation ?
        assemblyNode.createOrientationRelationship(freeBody.assemblyNodes.location):
        assemblyNode.createTranslationRelationship(freeBody.assemblyNodes.location);

      rigidBodyLinks.forEach(c => {
        c.internal = true;
        system.addConstraint(c);
      });
    }
  });

  system.finishTransaction();
  system.solveFine();

  return system.solveStatus;
}


function applyLocation(shell: MShell): void {

  const targetLocation = shell.assemblyNodes.location;



  shell.location$.update(mx => targetLocation.toMatrix());
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

  // shell.location$.update(csys => {
  //   return targetCsys;
  // });
  // shell.location$.mutate(csys => {
  //   csys.x = basis[0];
  //   csys.y = basis[1];
  //   csys.z = basis[2];
  //   csys.origin = new Vector(ox, oy, oz)._minus(shell.csys.origin);
  // });

}


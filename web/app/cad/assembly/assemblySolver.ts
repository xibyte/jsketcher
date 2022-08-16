import {SolveStatus} from "../../sketcher/constr/AlgNumSystem";
import {MShell} from "../model/mshell";
import {MObject} from "../model/mobject";
import {CadRegistry} from "../craft/cadRegistryBundle";
import {AssemblyConstraint, AssemblyConstraintDefinition} from "./assemblyConstraint";
import {AssemblyConstraintsSchemas} from "./assemblySchemas";
import {dfs} from "gems/traverse";
import {SixDOF} from "./dof/sixDOF";
import {AssemblyDOF} from "./dof/assemblyDOF";
import {Matrix3x4} from "math/matrix";

declare module '../model/mshell' {
  
  interface MShell {

    assemblyDOF: AssemblyDOF;  

  }

}

export interface RigidBody {

  model: MShell;

  constraints;

}

export class AssemblyProcess {

  queue: RigidBody[];
  solved: Set<RigidBody> = new Set();
  solveStatus: SolveStatus = {
    success: true,
    error: 0
  };
  errorStep = null;
  cadRegistry: CadRegistry;

  constructor(cadRegistry: CadRegistry, constraintDefs: AssemblyConstraintDefinition[]) {
    this.cadRegistry = cadRegistry;
    this.queue = buildAssemblyQueue(cadRegistry, constraintDefs)
  }

  begin() {
    this.cadRegistry.getAllShells().forEach(s => {
      s.location$.mutate(l => l.reset());
      s.assemblyDOF = new SixDOF();
    });
  }

  step() {

    const body = this.queue.pop();

    this.solveStatus = solve(body.constraints, body.model, body.model.location);
    if (!this.solveStatus.success) {
      this.errorStep = body.model.id;
      console.log("Assembly system hasn't been solved at the orientation step");
      return;
    }
    (body.model as MShell).location$.next(body.model.location);

    this.solved.add(body);
  }

  isDone(): boolean {
    return this.queue.length === 0;
  }

}

function buildAssemblyQueue(cadRegistry: CadRegistry, constraintDefs: AssemblyConstraintDefinition[]): RigidBody[] {

  const constraints: AssemblyConstraint[] = [];
  const graph: Map<MObject, AssemblyConstraint[]> = new Map();
  function assignConstraint(obj: MObject, constr: AssemblyConstraint) {
    let constrs = graph.get(obj);
    if (!constrs) {
      constrs = [];
      graph.set(obj, constrs)
    }
    constrs.push(constr);
  }

  constraintDefs.forEach(def => {
    const schema = AssemblyConstraintsSchemas[def.typeId];
    if (!schema) {
      console.error('reference to nonexistent constraint ' + def.typeId);
      return null;
    }

    const objects: MObject[] = [];
    let movingPart: MObject = null;
    let fixedPart: MObject = null;

    for (const id of def.objects) {
      const modelObject = cadRegistry.find(id);
      if (!modelObject) {
        console.warn('skipping constraint referring to nonexistent object ' + id);
        return null;
      }
      objects.push(modelObject);

      if (movingPart === null) {
        movingPart = modelObject.root;
      } else if (fixedPart === null) {
        if (modelObject.root !== movingPart) {
          fixedPart = modelObject.root;
        }
      } else {
        console.error('constraint may only involve two parts or less, skipping  ' + def.typeId);
        return null;
      }
    }

    const constraint = new schema.implementation(schema, fixedPart, movingPart, objects);
    constraints.push(constraint);
    if (movingPart) {
      assignConstraint(movingPart, constraint);
    }
  });

  const visited = new Set<MObject>();
  const topoOrder: MShell[] = [];
  for (const node of graph.keys()) {
    if (visited.has(node)) {
      continue;
    }
    dfs(node, (node, cb) => (graph.get(node)||[]).forEach(c => cb(c.fixedPart)), node => {
      if (visited.has(node)) {
        return;
      }
      visited.add(node);
      topoOrder.push(node);
    });
  }

  return topoOrder.reverse().map(model => ({
    model,
    constraints: graph.get(model)||[]
  }));
}


// function buildAssemblyQueue1(cadRegistry: CadRegistry, constraintDefs: AssemblyConstraintDefinition[]): RigidBody[] {
//
//   const constraints: AssemblyConstraint[] = [];
//
//   constraintDefs.forEach(def => {
//     const schema = AssemblyConstraints[def.typeId];
//     if (!schema) {
//       console.error('reference to nonexistent constraint ' + def.typeId);
//       return null;
//     }
//     const constraint = new AssemblyConstraint();
//     constraint.schema = schema;
//     for (const id of def.objects) {
//       const modelObject = cadRegistry.find(id);
//       if (!modelObject) {
//         console.warn('skipping constraint referring to nonexistent object ' + id);
//         return null;
//       }
//       constraint.objects.push(modelObject);
//     }
//     constraints.push(constraint);
//   });
//
//
//   const bodies = new Map<MObject, RigidBody>();
//   function body(obj: MObject) {
//     let rigidBody = bodies.get(obj);
//     if (!rigidBody) {
//       rigidBody = new RigidBody();
//       rigidBody.model = obj;
//       bodies.set(obj, rigidBody);
//     }
//     return rigidBody;
//   }
//
//   function link(a: MObject, b: MObject, constr: AssemblyConstraint) {
//     const rigidBodyA = body(a);
//     const rigidBodyB = body(b);
//
//     let arr = rigidBodyA.relationships.get(rigidBodyB);
//     if (!arr) {
//       arr = [];
//       rigidBodyA.relationships.set(rigidBodyB, arr);
//     }
//     arr.push(constr)
//   }
//
//   constraints.forEach(constr => {
//     const roots = new Set<MObject>();
//     constr.objects.forEach(o => roots.add(o.root));
//     const arr: MObject[] = Array.from(roots);
//     for (let i = 0; i < arr.length; i++) {
//       for (let j = i+1; j < arr.length; j++) {
//         link(arr[i], arr[j], constr);
//         link(arr[j], arr[i], constr);
//       }
//     }
//   });
//
//   return Array.from(bodies.values()).reverse();
// }

export function launchAssembly(assemblyProcess: AssemblyProcess): void {

  assemblyProcess.begin();

  while (!assemblyProcess.isDone()) {
    assemblyProcess.step();
    if (assemblyProcess.errorStep !== null) {
      break;
    }
  }

}

function solve(constraints: AssemblyConstraint[], freeBody: MShell, location: Matrix3x4): SolveStatus {

  for (const constr of constraints) {

    freeBody.assemblyDOF = constr.apply(freeBody.assemblyDOF);

  }

  return {
    success: true,
    error: 0
  }

}

// function solveTranslation(constraints: AssemblyConstraint[], freeBody: MObject, location: Matrix3): SolveStatus {
//
//   if (!(freeBody instanceof MShell)) {
//     throw 'unsupported: needs location implementation';
//   }
//
//   let trState: TranslationState = new TranslationState3DOF();
//
//   for (let constr of constraints) {
//
//     const dir = constr.schema.translation(constr.objects, freeBody);
//
//     trState = trState.applyConstraint(dir, location);
//
//   }
//
//   return {
//     success: true,
//     error: 0
//   }
//
// }



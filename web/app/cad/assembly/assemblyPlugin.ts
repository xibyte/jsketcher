import {ApplicationContext} from "context";
import {ModellerContextualActions} from "./ui/ModellerContextualActions";
import {state, StateStream} from "lstream";
import {AssemblyConstraintDefinition} from "./assemblyConstraintDefinition";
import {solveAssembly as solveAssemblyImpl} from "./assemblySolver";
import {Constraints3D, createAssemblyConstraint} from "./constraints3d";
import {SolveStatus} from "../../sketcher/constr/AlgNumSystem";
import {ConstantsDefinitions} from "../../sketcher/constr/ANConstraints";
import {AssemblyView} from "./ui/AssemblyView";
import {IoMdConstruct} from "react-icons/io";

export function activate(ctx: ApplicationContext) {

  const constraints$ = state<AssemblyConstraintDefinition[][]>([]);
  const status$ = state<SolveStatus>(null);

  function getConstraints(): AssemblyConstraintDefinition[][] {
    return constraints$.value;
  }

  function loadConstraints(inData: AssemblyConstraintDefinition[][]): void {
    constraints$.next(inData);
  }

  function addConstraint(typeId: string, objects: string[], constants?: ConstantsDefinitions): void {
    constraints$.mutate(stages => {
      if (stages.length === 0) {
        stages.push([])
      }
      stages[stages.length - 1].push({
        typeId, objects, constants
      });
    })
  }

  function removeConstraint(constr: AssemblyConstraintDefinition) {
    constraints$.mutate(stages => {
      for (let constrs of stages) {
        const index = constrs.indexOf(constr);
        if (index !== -1) {
          constrs.splice(index, 1);
        }
      }
    })
  }

  function solveAssembly(): void {
    if (ctx.craftService.isEditingHistory()) {
      console.log('skipping assembly resolve request in the history mode');
      return;
    }

    const stages = constraints$.value.map(stage => stage.map(constr => {
      const schema = Constraints3D[constr.typeId];
      if (!schema) {
        console.error('reference to nonexistent constraint ' + constr.typeId);
        return null;
      }
      const objects = [];
      for (const id of constr.objects) {
        const modelObject = ctx.cadRegistry.find(id);
        if (!modelObject) {
          console.warn('skipping constraint referring to nonexistent object ' + id);
          return null;
        }
        objects.push(modelObject);
      }
      return createAssemblyConstraint(schema, objects)
    } ).filter(x => x) );

    const solveStatus = solveAssemblyImpl(stages);

    status$.next(solveStatus);
  }

  constraints$.attach(solveAssembly);

  ctx.domService.contributeComponent(ModellerContextualActions);

  ctx.services.ui.registerFloatView('assembly', AssemblyView, 'Assembly', IoMdConstruct);

  ctx.craftService.modifications$.attach((modifications) => {
    //if we reach the end reevaluate locations
    if (modifications.pointer === modifications.history.length - 1) {
      solveAssembly();
    }
  });

  ctx.assemblyService = {
    constraints$, getConstraints, loadConstraints, solveAssembly, addConstraint, removeConstraint, status$
  }
}

export interface AssemblyService {

  constraints$: StateStream<AssemblyConstraintDefinition[][]>;

  status$: StateStream<SolveStatus>;

  addConstraint(typeId: string, objects: string[], constants?: ConstantsDefinitions): void;

  removeConstraint(constr: AssemblyConstraintDefinition): void;

  solveAssembly(): void;

  loadConstraints(constraints: AssemblyConstraintDefinition[][]);

  getConstraints(): AssemblyConstraintDefinition[][];

}

declare module 'context' {
  interface ApplicationContext {

    assemblyService: AssemblyService;
  }
}


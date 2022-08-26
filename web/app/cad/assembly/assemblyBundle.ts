import {ApplicationContext} from "cad/context";
import {ModellerContextualActions} from "./ui/ModellerContextualActions";
import {state, StateStream} from "lstream";

import {AssemblyProcess, launchAssembly} from "./assemblySolver";
import {SolveStatus} from "../../sketcher/constr/AlgNumSystem";
import {ConstantsDefinitions} from "../../sketcher/constr/ANConstraints";
import {AssemblyView} from "./ui/AssemblyView";
import {IoMdConstruct} from "react-icons/io";
import {AssemblyConstraintDefinition} from "./assemblyConstraint";
import {AssemblyConstraintsSchemas} from "./assemblySchemas";


export function activate(ctx: ApplicationContext) {

  const constraints$ = state<AssemblyConstraintDefinition[]>([]);
  const status$ = state<SolveStatus>(null);

  function getConstraints(): AssemblyConstraintDefinition[] {
    return constraints$.value;
  }

  function loadConstraints(inData: AssemblyConstraintDefinition[]): void {
    inData = inData.filter(constr => {
      const shouldBeFiltered = !AssemblyConstraintsSchemas[constr.typeId];
      if (shouldBeFiltered) {
        console.log('Unknown constraint ' + constr.typeId + ' will be skipped');
      }
      return !shouldBeFiltered;
    });
    constraints$.next(inData);
  }

  function addConstraint(typeId: string, objects: string[], constants?: ConstantsDefinitions): void {
    constraints$.mutate(constraints => {
      constraints.push({
        typeId, objects, constants
      });
    })
  }

  function removeConstraint(constr: AssemblyConstraintDefinition) {
    constraints$.mutate(constrs => {
      const index = constrs.indexOf(constr);
      if (index !== -1) {
        constrs.splice(index, 1);
      }
    })
  }

  function solveAssembly(): void {
    if (ctx.craftService.isEditingHistory) {
      console.log('skipping assembly resolve request in the history mode');
      return;
    }

    const constraints = constraints$.value;

    const assemblyProcess = new AssemblyProcess(ctx.cadRegistry, constraints);

    launchAssembly(assemblyProcess);

    status$.next(assemblyProcess.solveStatus);
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

  constraints$: StateStream<AssemblyConstraintDefinition[]>;

  status$: StateStream<SolveStatus>;

  addConstraint(typeId: string, objects: string[], constants?: ConstantsDefinitions): void;

  removeConstraint(constr: AssemblyConstraintDefinition): void;

  solveAssembly(): void;

  loadConstraints(constraints: AssemblyConstraintDefinition[]);

  getConstraints(): AssemblyConstraintDefinition[];

}

export interface AssemblyBundleContext {

  assemblyService: AssemblyService;
}

export const BundleName = "@Assembly";

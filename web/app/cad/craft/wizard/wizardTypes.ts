import {StateStream} from "lstream";
import {OperationRequest} from "cad/craft/craftPlugin";
import {MaterializedOperationParams, OperationParamValue, OperationParams} from "cad/craft/schema/schema";
import {Operation} from "cad/craft/operationPlugin";

export type ParamsPathSegment = string|number;

export type ParamsPath = ParamsPathSegment[];

export type FlattenPath = string;

export type WizardState = {
  activeParam: FlattenPath
};

export interface WizardContext {

  workingRequest$: StateStream<OperationRequest>;

  materializedWorkingRequest$: StateStream<MaterializedOperationParams>;

  state$: StateStream<WizardState>;

  updateParams: (mutator: (params: OperationParams) => void) => void;

  updateParam: (path: ParamsPath, value: OperationParamValue) => void;

  readParam: (path: ParamsPath) => OperationParamValue;

  updateState: (mutator: (state: WizardState) => void) => void;

  operation: Operation<any>;

  changingHistory: boolean;

  noWizardFocus: boolean;

  addDisposer: (disposer: () => any|void) => void;

  dispose: () => void;

  ID: number;
}
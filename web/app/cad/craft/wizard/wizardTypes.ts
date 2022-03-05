import {StateStream} from "lstream";
import {CraftHints, OperationRequest} from "cad/craft/craftPlugin";
import {MaterializedOperationParams, OperationParamValue, OperationParams} from "cad/craft/schema/schema";
import {Operation} from "cad/craft/operationPlugin";

export type ParamsPathSegment = string|number;

export type ParamsPath = ParamsPathSegment[];

export type FlattenPath = string;

export type WizardState = {
  activeParam?: FlattenPath
  error?: any
};

export type WorkingRequest = OperationRequest & {
  hints?: CraftHints,
  requestKey: number
}

export interface WizardService {

  workingRequest$: StateStream<WorkingRequest>;

  materializedWorkingRequest$: StateStream<MaterializedOperationParams>;

  state$: StateStream<WizardState>;

  open(type: string, initialOverrides: NewOperationCall);

  cancel();

  applyWorkingRequest();

  isInProgress(): boolean;

  workingRequest: OperationRequest;

  materializedWorkingRequest: any;

  updateParams: (mutator: (params: OperationParams) => void) => void;

  updateParam: (path: ParamsPath, value: OperationParamValue) => void;

  readParam: (path: ParamsPath) => OperationParamValue;

  updateState: (mutator: (state: WizardState) => void) => void;

  operation: Operation<any>;

  addDisposer: (disposer: () => any|void) => void;

}

export interface NewOperationCall {
  type: string;
  initialOverrides: OperationParams;
}

export type ValueUpdater = (value: OperationParamValue) => OperationParamValue;

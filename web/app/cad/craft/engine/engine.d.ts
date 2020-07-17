import {OperationResult} from "../craftPlugin";
import {BREPData} from "./brepData";
import {Handle} from "./handle";

export interface ModellingError {
  error: boolean;
}

export type ModelResponse = BREPData | Error

export interface ModelingEngine {

  extrude(params: {

  }): ModelResponse[];

  createBox(params: {}): OperationResult;

  createSphere(params: {}): OperationResult;

  createCone(params: {}): OperationResult;

  createCylinder(params: {}): OperationResult;

  createTorus(params: {}): OperationResult;

  boolean(params: {}): OperationResult;

  stepImport(params: {}): OperationResult;



}

export interface EngineSession {

  load(): Handle;

  dispose(): void;

}

export interface CraftEngine {


}

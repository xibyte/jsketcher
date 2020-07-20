import {OperationResult} from "../../web/app/cad/craft/craftPlugin";
import {BREPData} from "./data/brepData";
import {Handle} from "./data/handle";
import {Vec3} from "math/vec";
import {PrimitiveData} from "engine/data/primitiveData";

export enum BooleanType {
  UNION = 1,
  SUBTRACT,
  INTERSECT,
}

export interface OperationError {
  error: boolean;
  message?: string;
}

export type BREPResponse = BREPData | OperationError

export interface EngineAPI_V1 {

  /**
   * Extrudes a set of 2d paths to 3d object along with the given direction
   */
  extrude(params: {

    /**
     * Extrude direction
     */
    vector: Vec3;

    /**
     * Sketch to be extruded. Can be thought as a set of wires in the occt terminology
     */
    sketch: PrimitiveData[][];

    /**
     * Engine operation tolerance.
     */
    tolerance: number;

    /**
     * Tessellation detail parameter.
     */
    deflection: number;

    /**
     * extruded object can be used as a boolean modifier on a given shell
     */
    boolean: {

      type: BooleanType;

      /**
       * An operand on which the boolean operation will be performed
       */
      operand: Handle;
    }

  }): BREPResponse;

  boolean(params: {

    type: BooleanType;

    operandsA: Handle[],

    operandsB: Handle[],

    /**
     * Engine operation tolerance.
     */
    tolerance: number;

    /**
     * Tessellation detail parameter.
     */
    deflection: number;

  }): BREPResponse;

  createBox(params: {}): OperationResult;

  createSphere(params: {}): OperationResult;

  createCone(params: {}): OperationResult;

  createCylinder(params: {}): OperationResult;

  createTorus(params: {}): OperationResult;


  stepImport(params: {}): OperationResult;

}

export interface EngineSession {

  load(): Handle;

  dispose(): void;

}


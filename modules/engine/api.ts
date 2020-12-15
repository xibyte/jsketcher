import {BrepOutputData} from "./data/brepOutputData";
import {Handle} from "./data/handle";
import {Vec3} from "math/vec";
import {PrimitiveData} from "engine/data/primitiveData";
import {EdgeTessellation, FaceTessellation, Tessellation2D} from "engine/tessellation";
import {BrepInputData} from "engine/data/brepInputData";
import {Matrix3x4FlatData} from "math/matrix";
import {CurveData} from "engine/data/curveData";

export enum BooleanType {
  UNION = 1,
  SUBTRACT,
  INTERSECT,
}

export interface OperationError {
  error: boolean;
  message?: string;
}

export type GenericResponse = OperationError | {

  /**
   * List of consumed objects
   */
  consumed: Handle[];

  /**
   * List of create by the boolean operation objects
   */
  created: BrepOutputData[];
}

export type SingleResponse = OperationError | BrepOutputData;

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
     * Engine operation tolerance
     */
    tolerance: number;

    /**
     * Tessellation detail parameter
     */
    deflection: number;

    /**
     * extruded object can be used as a boolean modifier on a given shell
     */
    boolean: UnaryBooleanOptions;

  }): SingleResponse;


  /**
   * Revolves a set of 2d paths to 3d object along with the given direction
   */
  revolve(params: {

    /**
     * Rotation axis origin point or rotation pivot
     */
    axisOrigin: Vec3;

    /**
     * Rotation axis direction around which the rotation is performed
     */
    axisDir: Vec3,

    /**
     * Angle of rotation. In radians
     */
    angle: number;

    /**
     * Primitive paths to be revolved
     */
    sketch: PrimitiveData[][];

    /**
     * Engine operation tolerance
     */
    tolerance: number;

    /**
     * Tessellation detail parameter
     */
    deflection: number;

    /**
     * extruded object can be used as a boolean modifier on a given shell
     */
    boolean: UnaryBooleanOptions;

  }): SingleResponse;


  /**
   * Loft operation through list of primitive paths. Doesn't support to be a boolean modifier in this version of the API
   */
  loft(params: {

    /**
     * Primitive loops though which the loft object is created
     */
    sections: PrimitiveData[][];

    /**
     * Engine operation tolerance
     */
    tolerance: number;

    /**
     * Tessellation detail parameter
     */
    deflection: number;


  }): GenericResponse;

  /**
   * Split face by edge
   */
  splitFace(params: {

    /**
     * Base shape containing face to split
     */
    shape: Handle;

    /**
     * Face to split
     */
    face: Handle;

    /**
     * Splitting edge
     */
    edge:  {

      /**
       * Curve definition
       */
      curve: CurveData;

      /**
       * Optional bounds for the splitting curve. If uMin supplied uMax should be supplied as well
       */
      uMin?: number;

      /**
       * Optional bounds for the splitting curve. If uMax supplied uMin should be supplied as well
       */
      uMax?: number;

    };

    /**
     * Tessellation detail parameter
     */
    deflection: number;


  }): GenericResponse;

  /**
   * Split a shape by plane
   */
  splitByPlane(params: {

    /**
     * Base shape containing face to split
     */
    shape: Handle;

    /**
     * Splitting plane
     */
    plane:  {

      /**
       * Plane's point
       */
      point: Vec3;

      /**
       * Plane's normal
       */
      dir: Vec3;
    };

    /**
     * Tessellation detail parameter
     */
    deflection: number;


  }): GenericResponse;

  /**
   * Defeature a shape by removing faces
   */
  defeatureFaces(params: {

    /**
     * Base shape containing faces to remove
     */
    shape: Handle;

    /**
     * Faces to remove
     */
    faces: Handle[];

    /**
     * Tessellation detail parameter
     */
    deflection: number;


  }): GenericResponse;

  /**
   * Lightweight loft operation returning only tessellation info. Meant to be used as a preview in wizards
   */
  loftPreview(params: {

    /**
     * Primitive loops though which the loft object is created
     */
    sections: PrimitiveData[][];

    /**
     * Engine operation tolerance
     */
    tolerance: number;

    /**
     * Tessellation detail parameter
     */
    deflection: number;


  }): Tessellation2D<Vec3>;


  /**
   * Creates a set of fillets on given edges
   */
  fillet(params: {

    /**
     * Edges parent model
     */
    solid: Handle,

    /**
     * List of edges on which the operation performes
     */
    edges: {

      edge: Handle;

      /**
       * thickness of the fillet from one edge to another
       */
      thickness: number;
    }[]

    /**
     * Tessellation detail parameter
     */
    deflection: number;

  }): SingleResponse;

  /**
   * Generic boolean operation on given operands
   */
  boolean(params: {

    type: BooleanType;

    operandsA: Handle[],

    operandsB: Handle[],

    /**
     * Engine operation tolerance
     */
    tolerance: number;

    /**
     * Tessellation detail parameter
     */
    deflection: number;

  }): OperationError | {
    result: BrepOutputData
  };


  /**
   * Creates a box
   */
  createBox(params: {

    /**
     * Coordinate system in which the box will be created.
     */
    csys: CSysOptions,

    /**
     * width of the box
     */
    dx: number;

    /**
     * height of the box
     */
    dy: number;

    /**
     * depth of the box
     */
    dz: number;

    /**
     * created object can be used as a boolean modifier on given models
     */
    boolean: BooleanOptions


  }): GenericResponse;


  /**
   * Creates a sphere
   */
  createSphere(params: {

    /**
     * Coordinate system in which the sphere will be created.
     */
    csys: CSysOptions,

    /**
     * radius of the sphere
     */
    r: number;

    /**
     * created object can be used as a boolean modifier on given models
     */
    boolean: BooleanOptions

  }): GenericResponse;


  /**
   * Creates a cone
   */
  createCone(params: {

    /**
     * Coordinate system in which the cone will be created.
     */
    csys: CSysOptions,

    /**
     * radius of the cone
     */
    r1: number;

    /**
     * frustum of the cone
     */
    r2: number;

    /**
     * height of the cone
     */
    h: number;

    /**
     * created object can be used as a boolean modifier on given models
     */
    boolean: BooleanOptions

  }): GenericResponse;

  /**
   * Creates a cylinder
   */
  createCylinder(params: {

    /**
     * Coordinate system in which the cylinder will be created.
     */
    csys: CSysOptions,

    /**
     * radius of the cylinder
     */
    r: number;

    /**
     * radius of the cylinder
     */
    h: number,

    /**
     * created object can be used as a boolean modifier on given models
     */
    boolean: BooleanOptions

  }): GenericResponse;

  /**
   * Creates a torus
   */
  createTorus(params: {

    /**
     * Coordinate system in which the torus will be created.
     */
    csys: CSysOptions,

    /**
     * main radius
     */
    r1: number,

    /**
     * tube radius
     */
    r2: number

    /**
     * created object can be used as a boolean modifier on given models
     */
    boolean: BooleanOptions

  }): GenericResponse;

  /**
   * Imports a step file by its 'file reference'. The usage of this API is implementation specific. In webassembly environments
   * the file should exists on the virtual file system before calling this API
   */
  stepImport(params: {

    /**
     * File reference. The notion depends on the implementation. In webassmebly it can be a path to file on the virtual file
     * system. On Server side environments it can be a URL
     */
    file: string

  }): GenericResponse;

  /**
   * Load arbitrary BREP data into the engine
   * See example at @BrepInputData
   */
  loadModel(brep: BrepInputData): BrepOutputData;

  /**
   * Load arbitrary BREP data into the engine.
   */
  tessellate(request: {

    /**
     * Engine object reference
     */
    model: Handle,

    /**
     * Tessellation detail parameter
     */
    deflection: number;

  }): {

    faces: FaceTessellation[];

    edges: EdgeTessellation[];

  };

  /**
   * Applying transformation matrix
   */
  transform(request: {

    /**
     * Engine object reference to transform
     */
    model: Handle,

    /**
     * Transformation matrix represented as a flat array
     */
    matrix: Matrix3x4FlatData;

  }): BrepOutputData;

  /**
   * Sets the location for a model. Unlike the transform this method doesn't update the original geometry
   * but virtually moves/rotates the model.
   */
  setLocation(request: {

    /**
     * Engine object reference
     */
    model: Handle,

    /**
     * Location matrix represented as a flat array
     */
    matrix: Matrix3x4FlatData;

  }): void;

  /**
   * Gets the location assign to the model
   * @see setLocation method
   */
  getLocation(request: {

    /**
     * Engine object reference
     */
    model: Handle,

  }): Matrix3x4FlatData;

  /**
   * Returns the model's data
   */
  getModelData(request: {

    /**
     * Engine object reference
     */
    model: Handle,

  }): BrepOutputData;

  /**
   * Deletes a given model from memory
   */
  dispose(request: {

    /**
     * Engine object reference
     */
    model: Handle,

  }): void;

}

export interface EngineSession {

  load(): Handle;

  dispose(): void;

}


export interface BooleanOptions {

  type: BooleanType;

  /**
   * Array operand on which the boolean operation will be performed
   */
  operands: Handle[];

  /**
   * Boolean operation tolerance. Since it's operation can be a complementary operation to some main operation
   * we may control the tolerance separately for the boolean operation
   */
  tolerance: number;

}

/**
 * Unlike generic boolean options unary boolean options don't control the tolerance separately. The tolerance of
 * the operation it's embedded into will be used
 */
export interface UnaryBooleanOptions {

  type: BooleanType;

  /**
   * An operand on which the boolean operation will be performed
   */
  operand: Handle;
}

/**
 * A coordinate system parameters.
 */
export interface CSysOptions {

  /**
   * Origin(center) of the coordinate system
   */
  origin: Vec3;

  /**
   * Z axis direction
   */
  normal: Vec3;

  /**
   * X axis direction
   */
  xDir: Vec3;
}


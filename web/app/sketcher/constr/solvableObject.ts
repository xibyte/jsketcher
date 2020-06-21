import {Param} from "../shapes/param";

export interface SolvableObject {

  id: string;

}

export interface ISolveStage {
  objects: Set<SolvableObject>;
  index: number;
}
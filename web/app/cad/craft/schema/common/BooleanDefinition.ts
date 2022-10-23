import {MObject} from "cad/model/mobject";

export type BooleanKind = 'NONE' | 'UNION' | 'SUBTRACT' | 'INTERSECT';

export interface BooleanDefinition {

  kind: BooleanKind;

  targets: MObject[];

  simplify: boolean;

}


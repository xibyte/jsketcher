import {BrepOutputData} from "engine/data/brepOutputData";

export function CallCommand(command: string, args: any[]): number;

export function Interrogate(shapeName: string, structOnly?: boolean): BrepOutputData;

export function GetRef(shapeName: string): number;

export function ClassifyPointToFace(facePtr: number, x: number, y: number, z: number, tol: number): number;

export function ClassifyFaceToFace(face1Ptr: number, face2Ptr: number, tol: number): number;

export function ClassifyEdgeToFace(edgePtr: number, facePtr: number, tol: number): number;

export function IsEdgesOverlap(e1Ptr: number, e2Ptr: number, tol: number): boolean;

export function UpdateTessellation(shapePtr: number, deflection: number): number;

export function SetLocation(shapeName: string, matrixArray: number[]);

export function AddLocation(shapeName: string, matrixArray: number[]);

export function importStepFile(shapeName: string, fileName: string, oneOnly: boolean): number;


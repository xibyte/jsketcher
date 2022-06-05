import {BrepOutputData} from "engine/data/brepOutputData";

export function CallCommand(command: string, args: any[]): number;

export function Interrogate(shapeName: string, structOnly?: boolean): BrepOutputData;

export function GetRef(shapeName: string): number;

export function ClassifyPointToFace(facePtr: number, x: number, y: number, z: number, tol: number): number;

export function IsEdgesOverlap(e1Ptr: number, e2Ptr: number, tol: number): boolean;
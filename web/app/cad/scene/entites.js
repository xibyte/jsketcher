import {MShell} from '../model/mshell';
import {MFace} from '../model/mface';
import {MEdge} from '../model/medge';
import {MVertex} from '../model/mvertex';
import {MSketchObject} from '../model/msketchObject';
import {MDatum, MDatumAxis} from '../model/mdatum';
import {MLoop} from '../model/mloop';

export const SHELL = MShell.TYPE;
export const FACE = MFace.TYPE;
export const EDGE = MEdge.TYPE;
export const VERTEX = MVertex.TYPE;
export const SKETCH_OBJECT = MSketchObject.TYPE;
export const DATUM = MDatum.TYPE;
export const DATUM_AXIS = MDatumAxis.TYPE;
export const LOOP = MLoop.TYPE;


export const ENTITIES = [SHELL, DATUM, FACE, EDGE, VERTEX, SKETCH_OBJECT, DATUM_AXIS, LOOP];
export const PART_MODELING_ENTITIES = [SHELL, FACE, EDGE, VERTEX, SKETCH_OBJECT];
export const ASSEMBLY_ENTITIES = [SHELL, FACE, EDGE, VERTEX];

import {OCC_gp_Pnt, OCC_gp_Vector} from "occ/occ";
import Vector from "math/vector";
import {OCCContext} from "cad/craft/occPlugin";

export function vectorTo_gp_Pnt(oc: OCCContext, v: Vector): OCC_gp_Pnt {
    return new oc.gp_Pnt_3(v.x, v.y, v.z);
}

export function vectorTo_gp_Vector(oc: OCCContext, v: Vector): OCC_gp_Vector {
    return new oc.gp_Vec_4(v.x, v.y, v.z);
}

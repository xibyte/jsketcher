import {EntityKind} from "cad/model/entities";
import React from "react";
import {BiCubeAlt} from "react-icons/bi";
import {HiOutlineCubeTransparent} from "react-icons/hi";
import {AiOutlineRadiusSetting} from "react-icons/ai";
import {IoMdSquareOutline} from "react-icons/io";
import {GiThreePointedShuriken} from "react-icons/gi";
import {VscDebugBreakpointLogUnverified} from "react-icons/vsc";
import {FaVectorSquare} from "react-icons/fa";
import {CgArrowLongRightL, CgBorderRight} from "react-icons/cg";

export function ModelIcon(props: any) {

  const {entityType, ...otherProps} = props;

  const Comp = getIconComp(entityType);

  return <Comp {...otherProps} />
}

function getIconComp(entityType) {
  switch (entityType) {
    case EntityKind.SHELL: return BiCubeAlt;
    case EntityKind.EDGE: return CgBorderRight;
    case EntityKind.SKETCH_OBJECT: return AiOutlineRadiusSetting;
    case EntityKind.FACE: return IoMdSquareOutline;
    case EntityKind.LOOP: return FaVectorSquare;
    case EntityKind.VERTEX: return VscDebugBreakpointLogUnverified;
    case EntityKind.DATUM: return GiThreePointedShuriken;
    case EntityKind.DATUM_AXIS: return CgArrowLongRightL;
    default: return HiOutlineCubeTransparent;
  }
}
import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {FromMObjectProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import {MEdge} from "cad/model/medge";
import {MObject} from "cad/model/mobject";
import {MShell} from "cad/model/mshell";
import { MBrepFace, MFace } from 'cad/model/mface';
import icon from "./icon.svg";

interface TestFeatureParams {
  face: MFace,
  R: number,
  H: number,
  Q: number,


}

export const TestFeatureOperation: OperationDescriptor<any> = {
  id: 'TestFeature_TOOL',
  label: 'TestFeature/Chamfer',
  icon,
  info: 'TestFeature/Chamfer',
  path:__dirname,
  paramsInfo: ({size, opperationType,}) => `(${r(size)} ${r(opperationType)}})`,
  run: (params: TestFeatureParams, ctx: ApplicationContext) => {

    const occ = ctx.occService;
    const oci = occ.commandInterface;
    let edgeList = [];


    // oci.cylinder("aCylinder", params.R);

    // oci.line("aLine2d", "0", "0", "1", params.H);
    // console.log("before trim");
    // oci.trim("aSegment", "aLine2d", "0", 5* Math.PI);
    // console.log("After");

    // oci.mkedge("aHelixEdge", "aSegment", "aCylinder", "0", params.Q* Math.PI);

    // //# there is no curve 3d in the pcurve edge.
    // oci.mkedgecurve("aHelixEdge", "0.001");

    // oci.wire("aHelixWire", "aHelixEdge");

    // oci.circle("profile", params.R, "0", "0", "0", "4", "1", "1");
    // oci.mkedge("profile", "profile");
    // oci.wire("profile", "profile");
    // oci.mkplane("profile", "profile");
    // oci.mkshell("profile", "profile");

    // console.log("my face", params.face)


    const sketch = ctx.sketchStorageService.readSketch(params.face.id);

    const sweepSources = occ.utils.sketchToFaces(sketch, params.face.csys)

// console.log(sweepSources[0].face);

// oci.mkshell("shell", sweepSources[0].face);


const created = sweepSources.map((faceRef, i) => {
//alert(i)
  const faceName = faceRef.face;
  const shapeName = "[f]" + i;
  oci.mkshell(shapeName, faceName);
  return occ.io.getShell(shapeName,null);
});


console.log(created);



    return {created,
    consumed:[]}

    oci.pipe("aSpring", "aHelixWire", "profile");

    //holeSolids.push(occ.io.getShell("aSpring"));

    return {created:[occ.io.getShell("aSpring")],
    consumed:[]}

  },
  form: [
    {
      type: 'selection',
      name: 'face',
      capture: [EntityKind.FACE],
      label: 'Face',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'number',
      label: 'R',
      name: 'R',
      defaultValue: 5,
    },
    {
      type: 'number',
      label: 'H',
      name: 'H',
      defaultValue: 5,
    },
    {
      type: 'number',
      label: 'Q',
      name: 'Q',
      defaultValue: 5,
    },
  ],
}


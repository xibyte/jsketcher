import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { occ2brep } from 'cad/occ/occ2models';
import {readSketch, readSketchContour} from "cad/craft/e0/common";

export default {
    id: 'extrude',
    label: 'extrude',
    icon: 'img/cad/extrude',
    info: 'extrude',
    mutualExclusiveFields: [],
    paramsInfo: ({ length }) => `(${r(length)})`,
    run: (request, ctx: ApplicationContext) => {
        //const occObj = createCylinder(diameter, height, ctx.occService.occContext);
        const oc = ctx.occService.occContext;
        const face = ctx.cadRegistry.findFace(request.face);

        let sketch = ctx.sketchStorageService.readSketch(face.id);
        if (!sketch) throw 'sketch not found for the face ' + face.id;
        let contours = sketch.fetchContours();

        console.log(contours);

        // const mobject = new MBrepShell(occ2brep(aRes, ctx.occService.occContext));
        return {
            consumed: [],
            created: []
        };
    },
    schema: {
        length: {
            type: 'number',
            defaultValue: 500,
            label: 'length'
        },
        face: {
            type: 'face',
            initializeBySelection: 0
        },
    }
}


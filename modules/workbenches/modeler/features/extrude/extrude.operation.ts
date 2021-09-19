import { roundValueForPresentation as r } from 'cad/craft/operationHelper';

export default {
    id: 'EXTRUDE',
    label: 'Extrude',
    icon: 'img/cad/extrude',
    info: 'extrudes 2D sketch',
    paramsInfo: ({ value }) => `(${r(value)})`,
    mutualExclusiveFields: ['datumAxisVector', 'edgeVector', 'sketchSegmentVector'],
    run: (params, ctx) => {
        return ctx.craftEngine.cutExtrude(false, params);
    },
    schema: {
        value: {
            type: 'number',
            defaultValue: 50,
            label: 'height'
        },
        wierdField: {
            type: 'number',
            defaultValue: 50,
            label: 'weird field'
        },
        prism: {
            type: 'number',
            min: 0,
            defaultValue: 1
        },
        angle: {
            type: 'number',
            defaultValue: 0
        },
        rotation: {
            type: 'number',
            defaultValue: 0
        },
        face: {
            type: 'face',
            initializeBySelection: 0
        },
        datumAxisVector: {
            type: 'datumAxis',
            optional: true,
            label: 'datum axis'
        },
        edgeVector: {
            type: 'edge',
            optional: true,
            label: 'edge',
            accept: edge => edge.brepEdge.curve.degree === 1
        },
        sketchSegmentVector: {
            type: 'sketchObject',
            optional: true,
            label: 'sketch segment',
            accept: obj => obj.isSegment
        },
        flip: {
            type: 'boolean',
            defaultValue: false,
        }

    }
}

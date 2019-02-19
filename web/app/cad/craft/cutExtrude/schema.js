export default {
  value: {
    type: 'number',
    defaultValue: 50
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
    optional: true
  },
  edgeVector: {
    type: 'edge',
    optional: true,
    accept: edge => edge.brepEdge.curve.degree === 1
  },
  sketchSegmentVector: {
    type: 'sketchObject',
    optional: true,
    accept: obj => obj.isSegment
  },
  flip: {
    type: 'boolean',
    defaultValue: false,
  }
}

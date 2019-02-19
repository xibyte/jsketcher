export default {
  angle: {
    type: 'number',
    defaultValue: 45
  },
  face: {
    type: 'face',
    initializeBySelection: 0
  },
  axis: {
    type: 'sketchObject',
    initializeBySelection: 0
  },
  boolean: {
    type: 'enum',
    values: ['INTERSECT', 'SUBTRACT', 'UNION'],
    defaultValue: 'UNION',
    optional: true
  }
}

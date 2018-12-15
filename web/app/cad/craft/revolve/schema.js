export default {
  angle: {
    type: 'number',
    defaultValue: 45
  },
  face: {
    type: 'face',
    defaultValue: {type: 'selection'}
  },
  axis: {
    type: 'sketchObject',
    defaultValue: {type: 'selection'}
  },
  boolean: {
    type: 'enum',
    values: ['INTERSECT', 'SUBTRACT', 'UNION'],
    defaultValue: 'UNION',
    optional: true
  }
}

export default {
  orientation: {
    type: 'enum',
    values: ['XY', 'XZ', 'ZY'],
    defaultValue: 'XY'
  },
  parallelTo: {
    type: 'model',
    entity: 'face',
    optional: true,
  },
  depth: {
    type: 'number',
    defaultValue: 0
  }
}
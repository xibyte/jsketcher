export default {
  orientation: {
    type: 'enum',
    values: ['XY', 'XZ', 'ZY'],
    defaultValue: 'XY'
  },
  parallelTo: {
    type: 'face',
    optional: true,
  },
  depth: {
    type: 'number',
    defaultValue: 0
  }
}
export default {
  orientation: {
    type: 'string',
    enum: ['XY', 'XZ', 'ZY'],
    defaultValue: 'XY'
  },
  parallelTo: {
    type: 'entity',
    allowedKinds: 'face',
    optional: true,
  },
  depth: {
    type: 'number',
    defaultValue: 0
  }
}
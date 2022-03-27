export default {
  originatingFace: {
    type: 'face',
    initializeBySelection: 0,
    optional: true
  },
  x: {
    type: 'number',
    defaultValue: 0
  },
  y: {
    type: 'number',
    defaultValue: 0
  },
  z: {
    type: 'number',
    defaultValue: 0
  },
  rotations: {
    type: 'array',
    optional: true,
    defaultValue: [],
    items: {
      type: 'object',
      schema: {
        axis: {
          type: 'string',
          enum: ['X', 'Y', 'Z']
        },
        angle: {
          type: 'number',
          min: 0,
          max: 360
        }
      }
    }
  }
}
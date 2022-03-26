export default {
  orientation: {
    type: 'string',
    enum: ['XY', 'XZ', 'ZY'],
    defaultValue: 'XY'
  },
  datum: {
    type: 'entity',
    allowedKinds: ['face', 'datum'],
    optional: true,
    defaultValue: {
      usePreselection:  true,
      preselectionIndex: 0,
    }
  },
  depth: {
    type: 'number',
    defaultValue: 0
  }
}
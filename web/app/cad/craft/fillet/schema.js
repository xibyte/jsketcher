export default {
  edges: {
    type: 'array',
    itemType: ['edge', 'face'],

    max: 1,
    initializeBySelection: true,
    ui: {

    }
  },
  thickness: {
    type: 'number',
    defaultValue: 20,
    min: 10,
    max: 30,
    ui: {
      widget: 'slider'
    }
  }
}

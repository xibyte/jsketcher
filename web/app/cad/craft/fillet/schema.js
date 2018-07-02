export default {
  edges: {
    type: 'array',
    defaultValue: {
      type: 'selection',
      entity: 'edge',
      itemField: 'edge'
    },
    schema: {
      edge: {
        type: 'edge',
      },
      thickness: {
        type: 'number',
        defaultValue: 20
      }
    }
  }
}

export default {
  sections: {
    type: 'array',
    itemType: 'loop',
    initializeBySelection: true
  },
  boolean: {
    type: 'enum',
    values: ['INTERSECT', 'SUBTRACT', 'UNION'],
    defaultValue: 'UNION',
    optional: true
  }
}

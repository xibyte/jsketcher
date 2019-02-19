export default {
  sections: {
    type: 'array',
    itemType: 'loop',
    initializeBySelection: true,
    min: 2
  },
  boolean: {
    type: 'enum',
    values: ['INTERSECT', 'SUBTRACT', 'UNION'],
    defaultValue: 'UNION',
    optional: true
  }
}

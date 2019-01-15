export default {
  sections: {
    type: 'array',
    itemType: 'loop',
    defaultValue: {
      type: 'selection',
    }
  },
  boolean: {
    type: 'enum',
    values: ['INTERSECT', 'SUBTRACT', 'UNION'],
    defaultValue: 'UNION',
    optional: true
  }
}

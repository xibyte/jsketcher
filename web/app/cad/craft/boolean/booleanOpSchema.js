export default defaultValue => ({
  operandA: {
    type: 'shell',
    defaultValue: {type: 'selection'}
  },
  operandB: {
    type: 'shell',
    defaultValue: {type: 'selection'}
  },
  type: {
    type: 'enum',
    values: ['INTERSECT', 'SUBTRACT', 'UNION'], 
    defaultValue
  }
})

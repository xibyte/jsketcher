export default {
  datum: {
    type: 'datum',
    initializeBySelection: 0
  },
  axis: {
    type: 'enum',
    values: ['X', 'Y', 'Z'],
    defaultValue: 'X'
  },
  angle: {
    type: 'number',
    defaultValue: 0
  }
}
export default {
  datum: {
    type: 'datum',
    defaultValue: {type: 'selection'}
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
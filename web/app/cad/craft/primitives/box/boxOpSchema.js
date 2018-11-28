import booleanOptionSchema from '../booleanOptionSchema';

export default {
  datum: {
    type: 'datum',
    optional: true,
    defaultValue: {type: 'selection'}
  },
  width: {
    type: 'number',
    defaultValue: 500,
    min: 0
  },
  height: {
    type: 'number',
    defaultValue: 500,
    min: 0
  },
  depth: {
    type: 'number',
    defaultValue: 500,
    min: 0
  },
  boolean: booleanOptionSchema
}
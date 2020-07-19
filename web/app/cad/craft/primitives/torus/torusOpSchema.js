import booleanOptionSchema from '../booleanOptionSchema';

export default {
  datum: {
    type: 'datum',
    optional: true,
    initializeBySelection: 0
  },
  radius: {
    type: 'number',
    defaultValue: 250,
    min: 0
  },
  tube: {
    type: 'number',
    defaultValue: 50,
    min: 0
  },
  boolean: booleanOptionSchema
}
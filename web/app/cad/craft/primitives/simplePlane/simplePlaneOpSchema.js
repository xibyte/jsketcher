import {entityKindCapture} from "cad/craft/schema/types/entityType";

export default {
  orientation: {
    type: 'string',
    enum: ['XY', 'XZ', 'ZY'],
    defaultValue: 'XY'
  },
  datum: {
    type: 'entity',
    allowedKinds: entityKindCapture('face', 'datum'),
    optional: true,
    defaultValue: {
      usePreselection:  true,
      preselectionIndex: 0,
    }
  },
  depth: {
    type: 'number',
    defaultValue: 0
  }
}
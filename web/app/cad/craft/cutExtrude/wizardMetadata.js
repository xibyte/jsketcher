import {CURRENT_SELECTION as S} from "../wizard/wizardPlugin";

export function createWizardMetadata(valueLabel) {
  return [
    ['value'   , 'number',  50,  {label: valueLabel}], 
    ['prism'   , 'number',  1 ,  {min: 0, step: 0.1, round: 1}],
    ['angle'   , 'number',  0 ,  {}],
    ['rotation', 'number',  0 ,  {step: 5}],
    ['face'    , 'face'  ,  S  ]
  ];
}
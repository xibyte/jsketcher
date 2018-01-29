import React from 'react';
import PropTypes from 'prop-types';

import ls from './RadioButtons.less';

export default class RadioButtons extends React.Component {

  render() {
    return <div>{this.props.children}</div>
  }
  
  getChildContext() {
    return {
      radioButtonsGroupName: this.groupId,
      radioButtonsInitValue: this.props.initValue,
      radioButtonsOnChange: this.props.onChange
    }
  }
  
  groupId = 'group_' + GROUP_COUNTER++;
}

export function RadioButton({value, label}, {radioButtonsGroupName, radioButtonsInitValue, radioButtonsOnChange}) {
  let onChange = e => {
    radioButtonsOnChange(e.target.value)
  };
  return <label className={ls.radioButton}>
    <input type='radio' name={radioButtonsGroupName} defaultChecked={radioButtonsInitValue === value} 
           value={value} onChange={onChange}/> {label}
    
  </label>
}


RadioButtons.childContextTypes = {
  radioButtonsGroupName: PropTypes.string.isRequired,
  radioButtonsInitValue: PropTypes.string.isRequired,
  radioButtonsOnChange: PropTypes.func.isRequired
};

RadioButton.contextTypes = RadioButtons.childContextTypes;

let GROUP_COUNTER = 0;
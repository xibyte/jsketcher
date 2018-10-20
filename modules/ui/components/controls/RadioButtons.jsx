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
      radioButtonsValue: this.props.value,
      radioButtonsOnChange: this.props.onChange
    }
  }
  
  groupId = 'group_' + GROUP_COUNTER++;
}

export function RadioButton({value, label}, {radioButtonsGroupName, radioButtonsValue, radioButtonsOnChange}) {
  let onChange = e => {
    radioButtonsOnChange(e.target.value)
  };
  label = label || value;
  return <label className={ls.radioButton}>
    <input type='radio' name={radioButtonsGroupName} checked={radioButtonsValue === value} 
           value={value} onChange={onChange}/> {label}
    
  </label>
}


RadioButtons.childContextTypes = {
  radioButtonsGroupName: PropTypes.string.isRequired,
  radioButtonsValue: PropTypes.string.isRequired,
  radioButtonsOnChange: PropTypes.func.isRequired
};

RadioButton.contextTypes = RadioButtons.childContextTypes;

let GROUP_COUNTER = 0;
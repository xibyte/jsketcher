import React from 'react';
import PropTypes from 'prop-types';
import InputControl from './InputControl';

export default class CheckboxControl extends React.Component {
  
  render() {
    let {onChange, initValue} = this.props;
    return <input type='checkbox' 
              defaultValue={initValue} 
              onChange={e => onChange(e.target.value)}  /> 
  }
}

import React from 'react';
import PropTypes from 'prop-types';
import InputControl from './InputControl';

export default class TextControl extends React.Component {
  
  render() {
    let {onChange, initValue} = this.props;
    return <InputControl type='text' 
              defaultValue={initValue} 
              onChange={e => onChange(e.target.value)}  /> 
  }
}

TextControl.propTypes = {
  baseStep: PropTypes.number, 
  round: PropTypes.number, 
  min: PropTypes.number, 
  max: PropTypes.number, 
  accelerator: PropTypes.number, 
  initValue: PropTypes.number.isRequired, 
  onChange: PropTypes.func.isRequired
};

TextControl.defaultProps = {
  baseStep: 1,
  round: 0,
  accelerator: 100
};
import React from 'react';
import PropTypes from 'prop-types';
import InputControl from './InputControl';

export default class NumberControl extends React.Component {
  
  render() {
    let {onChange, value} = this.props;
    return <InputControl type='number' 
              onWheel={this.onWheel} 
              value={ value } 
              onChange={this.onChange}
              inputRef={input => this.input = input} /> 
  }
  
  onChange = e => {
    this.props.onChange(e.target.value);
  };
  
  onWheel = (e) => {
    let {baseStep, round, min, max, onChange, accelerator} = this.props;
    let delta = e.deltaY;
    let step = baseStep * (e.shiftKey ? accelerator : 1);
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 0;
    val = val + (delta < 0 ? -step : step);
    if (min !== undefined && val < min) {
      val = min;
    }
    if (max !== undefined && val > max) {
      val = max;
    }
    if (round !== 0) {
      val = val.toFixed(round);
    }
    this.input.value = val;
    onChange(val);
    e.preventDefault();
    e.stopPropagation();
  }
}

NumberControl.propTypes = {
  baseStep: PropTypes.number, 
  round: PropTypes.number, 
  min: PropTypes.number, 
  max: PropTypes.number, 
  accelerator: PropTypes.number, 
  onChange: PropTypes.func.isRequired
};

NumberControl.defaultProps = {
  baseStep: 1,
  round: 0,
  accelerator: 100
};
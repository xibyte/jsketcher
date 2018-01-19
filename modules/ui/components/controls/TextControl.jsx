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

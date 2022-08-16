import React from 'react';
import PropTypes from 'prop-types';
import InputControl from './InputControl';

export default class TextControl extends React.Component {
  
  render() {
    const {onChange, value, onFocus} = this.props;
    return <InputControl type='text'
                         value={value}
                         onChange={e => onChange(e.target.value)} onFocus={onFocus} />
  }
}

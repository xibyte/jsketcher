import React from 'react';

export default class ReadOnlyValueControl extends React.Component {
  
  render() {
    let {value, placeholder} = this.props;
    return <span>{value||placeholder}</span>; 
  }
}

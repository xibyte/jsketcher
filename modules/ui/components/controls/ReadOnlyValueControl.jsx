import React from 'react';

export default class ReadOnlyValueControl extends React.Component {
  
  render() {
    let {value} = this.props;
    return <span>{value}</span>; 
  }
}

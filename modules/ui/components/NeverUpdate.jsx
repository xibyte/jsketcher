import React, {Fragment} from 'react';

export default class NeverUpdate extends React.Component {

  shouldComponentUpdate() {
    return false;
  }
 
  render() {
    return <Fragment>{this.props.children}</Fragment>;
  }
  
}
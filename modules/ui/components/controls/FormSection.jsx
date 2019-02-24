import React from 'react';
import {Title} from '../Folder';

export class StackSection extends React.Component {
  
  render() {
    const {title, children} = this.props;
    return <React.Fragment>
      <Title>{title}</Title>
      {children}
    </React.Fragment>;
  }
  
}
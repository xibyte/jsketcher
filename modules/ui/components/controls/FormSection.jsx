import React from 'react';
import {Title} from '../Folder';

export class StackSection extends React.Component {
  
  render() {
    const {title, children, isClosed, onTitleClick} = this.props;
    return <React.Fragment>
      <Title isClosed={isClosed} onClick={onTitleClick}>{title}</Title>
      {!isClosed && children}
    </React.Fragment>;
  }
  
}
import React from 'react';

import ls from './Folder.less'
import Fa from "./Fa";

export default class Folder extends React.Component{
  
  constructor() {
    super();
    this.state = {
      closed: null
    }    
  }

  isClosed() {
    let {closable, defaultClosed} = this.props;
    if (!closable) return false;
    return closable && (this.state.closed === null ? defaultClosed : this.state.closed)
  }

  tweakClose = () => {
    this.setState({closed: !this.isClosed()});
  };
  
  render() {
    let {title, closable, children} = this.props;
    return <div className={ls.root}>
      <div className={ls.title} onClick={closable ? this.tweakClose : null}>
        <Fa fw icon={this.isClosed() ? 'chevron-right' : 'chevron-down'}/> 
        {title}
      </div>
      {!this.isClosed() && children}
    </div>
  }
}

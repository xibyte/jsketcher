import React from 'react';

import ls from './Folder.less'
import Fa from "./Fa";
import cx from 'classnames';

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
    let {title, closable, className, children} = this.props;
    return <div className={cx(ls.root, className)}>
      <Title title={title} onClick={closable ? this.tweakClose : null} isClosed={this.isClosed()}/>
      {!this.isClosed() && children}
    </div>
  }
}

export function Title({title, isClosed, onClick}) {
  return <div className={ls.title} onClick={onClick}>
    <span className={ls.handle}><Fa fw icon={isClosed ? 'chevron-right' : 'chevron-down'}/></span>
    {' '}{title}
  </div>;
}

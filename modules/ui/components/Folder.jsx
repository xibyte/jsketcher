import React, {useState} from 'react';

import ls from './Folder.less'
import Fa from "./Fa";
import cx from "classnames";

export function InnerFolder(props) {

  const [closed, setClosed] = useState(null)

  function isClosed(){
    const {closable, defaultClosed} = props;
    if (!closable) return false;
    return closable && (closed === null ? defaultClosed : closed)
  }

  function tweakClose(  ) {
    setClosed(!isClosed())
  }

  const {title, titleClass, closable, children} = props;
  return <React.Fragment>
    <Title onClick={closable ? tweakClose : null} isClosed={isClosed()} className={titleClass}>{title}</Title>
    {!isClosed() && children}
  </React.Fragment>
}

export default function Folder(inProps) {
  const {className, ...props} = inProps
  return <div className={className}>
    <InnerFolder {...props} />
  </div>
}
export function Title({children, isClosed, onClick, className}) {
  const titleCss = onClick ? {
    cursor: 'pointer'
  } : {};
  return <div className={cx(ls.title, className)} onClick={onClick}  style={titleCss}>
    <span className={ls.handle}><Fa fw icon={isClosed ? 'chevron-right' : 'chevron-down'}/></span>
    {' '}{children}
  </div>;
}

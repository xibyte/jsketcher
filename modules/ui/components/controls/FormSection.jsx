import React, {useState} from 'react';
import {Title} from '../Folder';

export function StackSection(props) {
  let {title, initialCollapse, collapsible, children} = props;

  if (collapsible === undefined) {
    collapsible = true;
  }

  const [visible, setVisible] = useState(!initialCollapse);

  const onTitleClick = collapsible ? () => setVisible(visible => !visible) : undefined;

  return <React.Fragment>
    <Title isClosed={!visible} onClick={onTitleClick}>{title}</Title>
    {visible && children}
  </React.Fragment>;
}
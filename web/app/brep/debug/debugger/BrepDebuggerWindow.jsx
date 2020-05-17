import React from 'react';
import Window from 'ui/components/Window';
import BrepDebugger from './brepDebugger';
import {addToGroup, clearGroup, createGroup, removeFromGroup} from 'scene/sceneGraph';
import Fa from 'ui/components/Fa';

import ls from './BrepDebuggerWindow.less';

class BrepDebuggerWindow extends React.Component {
  
  UNSAFE_componentWillMount() {
    this.brepDebugGroup = createGroup();
    addToGroup(this.props.auxGroup, this.brepDebugGroup);
  }
  
  componentWillUnmount() {
    clearGroup();
    removeFromGroup(this.props.auxGroup, this.brepDebugGroup);
  }
  
  render() {
    if (!this.props.visible) {
      return null;
    }
    return <Window initTop={10} initLeft={10} initHeight='95%'
                   icon={<Fa fw icon='bug'/>}
                   title='Brep Debugger'
                   className={ls.root}
                   onClose={this.props.close}>
      <BrepDebugger brepDebugGroup={this.brepDebugGroup}/>
    </Window>;
  }
}

import React from 'react';
import Window from 'ui/components/Window';
import BrepDebugger from './brepDebugger';
import connect, {PROPAGATE_SELF_PROPS} from 'ui/connectLegacy';
import {addToGroup, clearGroup, createGroup, removeFromGroup} from 'scene/sceneGraph';
import {createToken} from 'bus';
import Fa from 'ui/components/Fa';

import ls from './BrepDebuggerWindow.less';

export const BREP_DEBUG_WINDOW_VISIBLE = createToken('debug', 'brepDebugWindowVisible')

class BrepDebuggerWindow extends React.Component {
  
  componentWillMount() {
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

export default connect(BrepDebuggerWindow, BREP_DEBUG_WINDOW_VISIBLE, {
  mapProps: ([visible]) => ({visible}),
  mapActions: ({dispatch}) => ({
    close: () => dispatch(BREP_DEBUG_WINDOW_VISIBLE, false)
  })
});
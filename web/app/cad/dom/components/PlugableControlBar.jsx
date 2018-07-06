import React from 'react';
import ControlBar, {ControlBarButton} from './ControlBar';
import connect from 'ui/connect';
import Fa from 'ui/components/Fa';
import {toIdAndOverrides} from '../../actions/actionRef';
import {isMenuAction} from '../menu/menuPlugin';
import {combine, merger} from 'lstream';
import mapContext from 'ui/mapContext';
import decoratorChain from '../../../../../modules/ui/decoratorChain';
import {menuAboveElementHint} from '../menu/menuUtils';

export default function PlugableControlBar() {
  return <ControlBar left={<LeftGroup />} right={<RightGroup />}/>;
}

function ButtonGroup({actions}) {
  return actions.map(actionRef => { 
    let [id, overrides] = toIdAndOverrides(actionRef);
    return <ConnectedActionButton key={id} actionId={id} {...overrides} />;
  });
}

class ActionButton extends React.Component {
  
  render() {
    let {label, cssIcons, enabled, visible, actionId, ...props} = this.props;
    if (!visible) {
      return null;
    }
    if (isMenuAction(actionId)) {
      let onClick = props.onClick;
      props.onClick = e => onClick(menuAboveElementHint(this.el));
    }
    
    return <ControlBarButton disabled={!enabled} onElement={el => this.el = el} {...props} >
      {cssIcons && <Fa fa={cssIcons} fw/>} {label}
    </ControlBarButton>;
  }
}

const LeftGroup = connect(streams => streams.ui.controlBars.left.map(actions => ({actions})))(ButtonGroup);
const RightGroup = connect(streams => streams.ui.controlBars.right.map(actions => ({actions})))(ButtonGroup);

const ConnectedActionButton = decoratorChain(

  connect(
    (streams, props) => combine(
      streams.action.appearance[props.actionId],
      streams.action.state[props.actionId]).map(merger)),
    
    mapContext(({services}, props) => ({
      onClick: data => services.action.run(props.actionId, data)
    }))
)
(ActionButton);


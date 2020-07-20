import React from 'react';
import ControlBar, {ControlBarButton} from './ControlBar';
import connect from 'ui/connect';
import Fa from 'ui/components/Fa';
import {toIdAndOverrides} from '../../actions/actionRef';
import {isMenuAction} from '../menu/menuPlugin';
import {menuAboveElementHint} from '../menu/menuUtils';
import {useStream} from "ui/effects";
import {ActionButtonBehavior} from "../../actions/ActionButtonBehavior";

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

function ConnectedActionButton(props) {

  const actionId = props.actionId;

  const actionAppearance = useStream(ctx => ctx.streams.action.appearance[actionId]);
  const actionState = useStream(ctx => ctx.streams.action.state[actionId]);

  if (!actionAppearance || !actionState) {
    return null;
  }

  return <ActionButtonBehavior actionId={actionId}>
    {behaviourProps => <ActionButton {...behaviourProps} {...actionAppearance} {...actionState} {...props} />}
  </ActionButtonBehavior>;
}


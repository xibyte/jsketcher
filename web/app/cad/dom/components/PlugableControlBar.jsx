import React, {Fragment} from 'react';
import ControlBar, {ControlBarButton} from './ControlBar';
import connect from 'ui/connect';
import Fa from 'ui/components/Fa';
import {TOKENS as UI_TOKENS} from '../uiEntryPointsPlugin';
import {TOKENS as ACTION_TOKENS} from '../../actions/actionSystemPlugin';
import {toIdAndOverrides} from "../../actions/actionRef";
import {mapActionBehavior} from "../../actions/actionButtonBehavior";


export default function PlugableControlBar() {
  return <ControlBar left={<LeftGroup />} right={<RightGroup />}/>;
}

function ButtonGroup({actions}) {
  return actions.map(actionRef => { 
    let [id, overrides] = toIdAndOverrides(actionRef);
    let Comp = connect([ACTION_TOKENS.actionAppearance(id), ACTION_TOKENS.actionState(id)],
      ActionButton, {actionId: id},
      ([appearance, state]) => Object.assign({}, appearance, state, overrides),
      mapActionBehavior(id)
    );
    return <Comp key={id}/>;
  });
}

function isMenuAction(actionId) {
  return actionId.startsWith('menu.');
}

class ActionButton extends React.Component {
  
  render() {
    let {label, cssIcons, enabled, visible, actionId, ...props} = this.props;
    if (!visible) {
      return null;
    }
    if (isMenuAction(actionId)) {
      let onClick = props.onClick;
      props.onClick = e => onClick(getMenuData(this.el));
    }
    
    return <ControlBarButton disabled={!enabled} onElement={el => this.el = el} {...props} >
      {cssIcons && <Fa fa={cssIcons} fw/>} {label}
    </ControlBarButton>;
  }
}

const LeftGroup = connect(UI_TOKENS.CONTROL_BAR_LEFT, ButtonGroup, undefined, ([actions]) => ({actions}));
const RightGroup = connect(UI_TOKENS.CONTROL_BAR_RIGHT, ButtonGroup, undefined, ([actions]) => ({actions}));

function getMenuData(el) {
  //TODO: make more generic
  return {
    orientationUp: true,
    flatBottom: true,
    x: el.offsetParent.offsetParent.offsetLeft + el.offsetLeft,
    y: el.offsetParent.offsetHeight - el.offsetTop
  };
}

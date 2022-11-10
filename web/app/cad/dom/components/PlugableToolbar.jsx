import React from 'react';
import Fa from 'ui/components/Fa';
import Toolbar, {ToolbarBraker, ToolbarButton, ToolbarGroup, ToolbarSplitter} from 'ui/components/Toolbar';
import ImgIcon from 'ui/components/ImgIcon';
import {toIdAndOverrides} from '../../actions/actionRef';
import {ActionButtonBehavior} from '../../actions/ActionButtonBehavior';
import capitalize from 'gems/capitalize';
import {constant} from 'lstream';
import {useStream} from "ui/effects";
import {NoIcon} from "../../../sketcher/icons/NoIcon";
import {GrCircleQuestion} from "react-icons/all";
import {memoize} from "lodash/function";

function ConfigurableToolbar({actions, size, ...props}) {
  return <Toolbar size={size} {...props}>
    <ToolbarActionButtons actions={actions} size={size} />
  </Toolbar>
}

export function ToolbarActionButtons({actions, showTitles, size}) {
  return actions.map((actionRef, i) => {
    if (actionRef === '-') {
      return <ToolbarSplitter key={'ToolbarSplitter' + i} />;
    } else if (actionRef === '|') {
      return <ToolbarBraker key={'ToolbarBraker' + i} />;
    } else if (Array.isArray(actionRef)) {
      return <ToolbarGroup><ToolbarActionButtons actions={actionRef} showTitles={showTitles} size={size} /></ToolbarGroup>;
    }
    const [id, overrides] = toIdAndOverrides(actionRef);
    return <ConnectedActionButton actionId={id} key={id} size={size} {...overrides} noLabel={!showTitles}/>
  });
}

function ActionButton({label, icon, icon96, icon32, cssIcons, symbol, size = 'large', noLabel, enabled, visible, actionId, ...props}) {
  if (!visible) {
    return null;
  }

  const smallOrMedium = size === 'medium' || size === 'small';
  if (icon) {
    const Icon = icon;
    icon = <Icon size={size}/>;
  }
  if (!icon) {
    if (smallOrMedium) {
      if (cssIcons) {
        icon = <Fa fa={cssIcons} fw />;
      } else if (icon32) {
        icon = <ImgIcon url={icon32} size={size === 'small' ? 16 : 24} />;
      }
    } else {
      icon = <ImgIcon url={icon96} size={48} />;
    }
  }
  if (!icon) {
    const txtStub = symbol||(label&&label.charAt(0));
    icon = txtStub ?  <span>{txtStub}</span> : <NoIcon />;
  }
    
  return <ToolbarButton disabled={!enabled} {...props}>
    {icon}
    {!(smallOrMedium || noLabel)&& <div>{capitalize(label)}</div>}
  </ToolbarButton>
}

export const NonExistentAppearance = memoize((actionId) => {
  return constant({
    info: "unknown action: " + actionId,
    label: "unknown action " + actionId,
    icon: () => <span>?{actionId}?</span>
  })
})

export const NonExistentState = constant({
  enabled: true,
  visible: true
});


export function ConnectedActionButton(props) {

  const actionId = props.actionId;
  const actionAppearance = useStream(ctx => (ctx.streams.action.appearance[actionId] || NonExistentAppearance(actionId)));
  const actionState = useStream(ctx => ctx.streams.action.state[actionId] || NonExistentState);
  if (!actionAppearance || !actionState) {
    return null;
  }

  return<ActionButtonBehavior actionId={actionId}>
    {behaviourProps => <ActionButton {...behaviourProps} {...actionAppearance} {...actionState} {...props} />}
  </ActionButtonBehavior>;

}

export function createPlugableToolbar(streamSelector) {
  return function (props) {
    const actions = useStream(ctx => streamSelector(ctx.streams));
    if (!actions) {
      return null;
    }
    return <ConfigurableToolbar actions={actions} {...props} />;
  }
}

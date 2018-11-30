import React from 'react';
import connect from 'ui/connect';
import Fa from 'ui/components/Fa';
import Toolbar, {ToolbarButton} from 'ui/components/Toolbar';
import ImgIcon from 'ui/components/ImgIcon';
import {toIdAndOverrides} from '../../actions/actionRef';
import {mapActionBehavior} from '../../actions/actionButtonBehavior';
import capitalize from 'gems/capitalize';
import decoratorChain from 'ui/decoratorChain';
import {combine, merger} from 'lstream';
import mapContext from 'ui/mapContext';
import {ToolbarSplitter} from 'ui/components/Toolbar';

function ConfigurableToolbar({actions, size, ...props}) {
  return <Toolbar size={size} {...props}>
    <ToolbarActionButtons actions={actions} size={size} />
  </Toolbar>
}

export function ToolbarActionButtons({actions, size}) {
  return actions.map(actionRef => {
    if (actionRef === '-') {
      return <ToolbarSplitter />;
    }
    let [id, overrides] = toIdAndOverrides(actionRef);
    return <ConnectedActionButton actionId={id} key={id} size={size} {...overrides} />
  });
}

function ActionButton({label, icon96, icon32, cssIcons, symbol, size, noLabel, enabled, visible, actionId, ...props}) {
  if (!visible) {
    return null;
  }

  let smallOrMedium = size === 'medium' || size === 'small';
  let icon;
  if (smallOrMedium) {
    if (cssIcons) {
      icon = <Fa fa={cssIcons} fw />;  
    } else if (icon32) {
      icon = <ImgIcon url={icon32} size={size === 'small' ? 16 : 24} />;
    }
  } else {
    icon = <ImgIcon url={icon96} size={48} />; 
  }
  if (!icon) {
    icon = <span>{symbol||(label&&label.charAt(0))}</span>;
    if (!icon) {
      icon = '?';
    }
  }
    
  return <ToolbarButton disabled={!enabled} {...props}>
    {icon}
    {!(smallOrMedium || noLabel)&& <div>{capitalize(label)}</div>}
  </ToolbarButton>
}

export const ConnectedActionButton = decoratorChain(
  connect((streams, {actionId})  => combine(streams.action.appearance[actionId], streams.action.state[actionId]).map(merger)),
  mapContext(mapActionBehavior(props => props.actionId))
)
(ActionButton);

export function createPlugableToolbar(streamSelector) {
  return decoratorChain(
    connect(streams => streamSelector(streams).map(actions => ({actions})))
  )
  (props => <ConfigurableToolbar {...props} />);
}

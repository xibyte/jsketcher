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
import mapContext from '../../../../../modules/ui/mapContext';

function ConfigurableToolbar({actions, small, ...props}) {

  return <Toolbar small={small} {...props}>
    {actions.map(actionRef => {
      let [id, overrides] = toIdAndOverrides(actionRef);
      return <ConnectedActionButton actionId={id} key={id} small={small} {...overrides} />
    })}
  </Toolbar>
}

function ActionButton({label, icon96, icon32, cssIcons, symbol, small, enabled, visible, actionId, ...props}) {
  if (!visible) {
    return null;
  }

  let icon;
  if (small) {
    if (cssIcons) {
      icon = <Fa fa={cssIcons} fw />;  
    } else if (icon32) {
      icon = <ImgIcon url={icon32} size={16} />;
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
    {!small && <div>{capitalize(label)}</div>}
  </ToolbarButton>
}

const ConnectedActionButton = decoratorChain(
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

export const HeadsUpToolbar = createPlugableToolbar(streams => streams.ui.toolbars.headsUp);
export const AuxiliaryToolbar = createPlugableToolbar(streams => streams.ui.toolbars.auxiliary);


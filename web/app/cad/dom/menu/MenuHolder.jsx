import React from 'react';
import Menu, {MenuItem, MenuSeparator} from 'ui/components/Menu';
import Filler from 'ui/components/Filler';
import Fa from 'ui/components/Fa';
import {ActionButtonBehavior} from '../../actions/ActionButtonBehavior';
import connect from 'ui/connect';
import {combine, merger} from 'lstream';
import {useStream} from "ui/effects";
import {NonExistentAppearance, NonExistentState} from "cad/dom/components/PlugableToolbar";

function MenuHolder({menus}) {
  return menus.map(({id, actions}) => <ConnectedActionMenu key={id} menuId={id} actions={actions} />); 
}

function ActionMenu({actions, keymap, ...menuState}) {
  if (!Array.isArray(actions)) {
    actions = actions();
  }
  return <Menu {...menuState}>
    {actions.map((action, index) => {
      if (action === '-') {
        return <MenuSeparator key={index} />
      }
      return <ConnectedMenuItem key={action} actionId={action} hotKey={keymap[action]} />;  
    })}
  </Menu>;
}

function ActionMenuItem({label, cssIcons, icon, icon32, icon96, enabled, hotKey, visible, actionId, ...props}) {
  if (!visible) {
    return null;
  }
  let renderedIcon, style;
  if (icon) {
    const Icon = icon;
    renderedIcon = <Icon />;
  } else {
    if (icon32 || icon96) {
      const size = 16;
      renderedIcon = <Filler width={size} height='1.18em'/>;
      style = {
        backgroundImage: `url(${icon32 || icon96})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${size}px ${size}px`,
        backgroundPositionX: 5,
        backgroundPositionY: 4,
      };
      if (!enabled) {
        style.filter = 'grayscale(90%)';
      }
    } else if (cssIcons) {
      renderedIcon = <Fa fw fa={cssIcons} />;
    }
  }

  return <MenuItem icon={renderedIcon} {...{label, style, disabled: !enabled, hotKey, ...props}} />;
}

const ConnectedActionMenu = connect((streams, props) =>
  combine(
    streams.ui.menu.states[props.menuId],
    streams.ui.keymap)
    .map(([s, keymap]) => ({...s, keymap})))(ActionMenu);

export function ConnectedMenuItem(props) {

  const actionId = props.actionId;

  const actionAppearance = useStream(ctx => (ctx.streams.action.appearance[actionId] || NonExistentAppearance(actionId)));
  const actionState = useStream(ctx => ctx.streams.action.state[actionId] || NonExistentState);

  if (!actionAppearance || !actionState) {
    return null;
  }

  return <ActionButtonBehavior actionId={actionId}>
    {behaviourProps => <ActionMenuItem {...behaviourProps} {...actionAppearance} {...actionState} {...props} />}
  </ActionButtonBehavior>;

}


export default connect(streams => streams.ui.menu.all.map(menus => ({menus})))(MenuHolder);




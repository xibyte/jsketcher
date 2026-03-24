import React from 'react';
import Window, {WindowControlButton, WindowProps} from 'ui/components/Window';
import {DocumentationTopic$} from "doc/DocumentationWindow";
import {IoMdHelp} from "react-icons/io";
import cx from 'classnames';
import Stack from "ui/components/Stack";
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";

export function GenericWizard({documentationLink, title, icon, left, top, className, children, onCancel, onOK, infoText, cancelLabel, hideOK, ...props}: {
  documentationLink: string,
  title: string,
  left?: number,
  top?: number,
  onCancel: () => any,
  onOK: () => any,
  infoText?: any,
  icon?: any,
  cancelLabel?: string,
  hideOK?: boolean,
} & WindowProps ) {

  return <Window initWidth={250}
                   initLeft={left || 15}
                   initTop={top}
                   title={(title||'').toUpperCase()}
                   icon={icon}
                   className={cx('mid-typography', className)}
                   onEscapePressed={onCancel}
                   onEnterPressed={hideOK ? undefined : onOK}
                   controlButtons={<>
                     <WindowControlButton title='help' onClick={(e) => DocumentationTopic$.next({
                       documentationLink: documentationLink,
                       x: e.pageX + 40,
                       y: e.pageY
                     })}>
                       <IoMdHelp />
                     </WindowControlButton>
                   </>} {...props} >
    {children}
    <Stack>
      <ButtonGroup>
        <Button className='dialog-cancel' onClick={onCancel}>{cancelLabel || 'Cancel'}</Button>
        {!hideOK && <Button className='dialog-ok' type='accent' onClick={onOK}>OK</Button>}
      </ButtonGroup>
      {infoText}
    </Stack>

  </Window>
}



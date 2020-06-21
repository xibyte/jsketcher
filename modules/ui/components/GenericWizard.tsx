import React from 'react';
import Window, {WindowControlButton, WindowProps} from 'ui/components/Window';
import {DocumentationTopic$} from "doc/DocumentationWindow";
import {IoMdHelp} from "react-icons/io";
import cx from 'classnames';
import Stack from "ui/components/Stack";
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";

export function GenericWizard({topicId, title, left, className, children, onCancel, onOK, infoText, ...props}: {
  topicId: string,
  title: string,
  left?: number,
  onCancel: () => any,
  onOK: () => any,
  infoText: string
} & WindowProps ) {

  return <Window initWidth={250}
                   initLeft={left || 15}
                   title={(title||'').toUpperCase()}
                   className={cx('mid-typography', className)}
                   controlButtons={<>
                     <WindowControlButton title='help' onClick={(e) => DocumentationTopic$.next({
                       topic: topicId,
                       x: e.pageX + 40,
                       y: e.pageY
                     })}>
                       <IoMdHelp />
                     </WindowControlButton>
                   </>} {...props} >
    {children}
    <Stack>
      <ButtonGroup>
        <Button className='dialog-cancel' onClick={onCancel}>Cancel</Button>
        <Button className='dialog-ok' type='accent' onClick={onOK}>OK</Button>
      </ButtonGroup>
      {infoText}
    </Stack>

  </Window>
}



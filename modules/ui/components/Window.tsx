import React from 'react';

import ls from './Window.less'
import cx from 'classnames';
import {NOOP} from 'gems/func';
import {FaTimes} from 'react-icons/fa';

export interface WindowProps {

  initWidth?: number;
  initHeight?: number;
  initLeft?: number;
  initTop?: number;
  initRight?: number;
  initBottom?: number;
  centerScreen?: boolean
  setFocus?: (HTMLElement) => void;
  className?: string;
  resizeCapturingBuffer?: number;
  resize?: number;
  onResize?: any;
  enableResize?: boolean;
  children?: any;
  title: string,
  icon?: JSX.Element,
  controlButtons?: JSX.Element;
  minimizable?: boolean;
  onClose: () => void;
  props?: JSX.IntrinsicAttributes;
  footer?: JSX.Element;
  compact?: boolean;
  onEscapePressed?: () => any,
  onEnterPressed?: () => any
}

export default class Window extends React.Component<WindowProps> {
  

  resizeHelper = new ResizeHelper();
  dragOrigin: { x: any; y: any };
  el: HTMLElement;
  originLocation: {
    left: number,
    top: number,
    right: number
  };

  render() {

    const {initWidth, initHeight, initLeft, initTop, initRight, initBottom, centerScreen, setFocus, className, resizeCapturingBuffer,
      resize, enableResize, children, title, icon, minimizable = false, onClose, controlButtons, footer, compact,
      onEscapePressed, onEnterPressed,
      onResize, ...props} = this.props;

    const onKeyDown = e => {
      switch (e.keyCode) {
        case 27 :
          onEscapePressed ? onEscapePressed() : onClose();
          break;
        case 13 :
          onEnterPressed();
          break;
      }
    };

    return <div className={cx(ls.root, this.resizeConfig&&ls.mandatoryBorder, compact&&ls.compact, className)} {...props} ref={this.keepRef} onKeyDown={onKeyDown}>
      <div className={ls.bar + ' disable-selection'} onMouseDown={this.startDrag} onMouseUp={this.stopDrag}>
        <div className={ls.title}>{icon} <b>{title.toUpperCase()}</b></div>
        <div className={ls.controlButtons}>
          {controlButtons}
          {minimizable &&  <WindowControlButton onClick={onClose}>_</WindowControlButton>}
          <WindowControlButton danger={true} onClick={onClose}><FaTimes /></WindowControlButton>
        </div>
      </div>
      <div className={cx(ls.content, 'compact-scroll')}>
        {children}
      </div>
      <>{footer}</>
    </div>

  }

  
  componentDidMount() {
    if (this.props.setFocus) {
      this.props.setFocus(this.el);
    } else {
      this.el.focus();
    }
    document.body.addEventListener("mousemove", this.moveListener, false);
    document.body.addEventListener("mouseup", this.mouseupListener, false);
  }

  componentWillUnmount() {
    document.body.removeEventListener("mousemove", this.moveListener, false);
    document.body.removeEventListener("mouseup", this.mouseupListener, false);
  }

  mouseupListener = e => {
    if (this.dragOrigin) {
      this.stopDrag(e);
    } else if (this.resizeHelper.moveHandler) {
      this.resizeHelper.moveHandler = null;
    }
  };

  moveListener = e => {
    if (this.dragOrigin) {
      this.doDrag(e);
    } else if (this.resizeHelper.moveHandler) {
      this.resizeHelper.moveHandler(e);
    }
  };

  startDrag = e => {
    this.dragOrigin = {x : e.pageX, y : e.pageY};
    let left = this.el.offsetLeft;
    let top = this.el.offsetTop;
    if (left === undefined) {
      left = this.el.offsetLeft;
    }
    if (top === undefined) {
      top = this.el.offsetTop;
    }
    this.originLocation = {
      left,
      top,
      right: undefined
    };
  };
  
  doDrag = e => {
    if (this.dragOrigin) {
      const dx = e.pageX - this.dragOrigin.x;
      const dy = e.pageY - this.dragOrigin.y;

      this.el.style.left = this.originLocation.left + dx + 'px';
      this.el.style.top = this.originLocation.top + dy + 'px';
      e.preventDefault();
    }
  };

  stopDrag = e => {
    this.dragOrigin = null;
  };

  keepRef = el => {
    if (el === null) {
      return;
    }
    const {initWidth, initHeight, initLeft, initTop, initRight, initBottom, resizeCapturingBuffer, onResize, centerScreen, ...props} = this.props;

    if (initWidth) {
      el.style.width = initWidth + 'px';
    }
    if (initHeight) {
      el.style.height = initHeight + 'px';
    }
    if (initLeft) {
      el.style.left = initLeft + 'px';
    } else if (initRight) {
      el.style.left = (window.innerWidth - el.offsetWidth - initRight) + 'px';
    }
    if (initTop) {
      el.style.top = initTop + 'px';
    } else if (initBottom) {
      el.style.top = (window.innerHeight - el.offsetHeight - initBottom) + 'px';
    }

    if (centerScreen) {
      el.style.left = (window.innerWidth/2 - el.offsetWidth/2) + 'px';
      el.style.top = (window.innerHeight/2 - el.offsetHeight/2) + 'px';
    }

    this.resizeHelper.registerResize(el, this.resizeConfig, resizeCapturingBuffer, onResize);
    this.el = el;
  };

  get resizeConfig() {
    let {resize, enableResize} = this.props;
    if (enableResize) {
      resize= DIRECTIONS.NORTH | DIRECTIONS.SOUTH | DIRECTIONS.WEST | DIRECTIONS.EAST;
    }
    return resize;
  }
}

export class ResizeHelper {

  moveHandler: any;
  controlGlobalListeners: boolean;

  constructor (controlGlobalListeners = false) {
    this.moveHandler = null;
    this.controlGlobalListeners = controlGlobalListeners;
  }

  captureResize(el, dirMask, e, onResize) {

    const origin = {x : e.pageX, y : e.pageY};
    const bcr = el.getBoundingClientRect();

    const north = _maskTest(dirMask, DIRECTIONS.NORTH);
    const south = _maskTest(dirMask, DIRECTIONS.SOUTH);
    const west = _maskTest(dirMask, DIRECTIONS.WEST);
    const east = _maskTest(dirMask, DIRECTIONS.EAST);

    this.moveHandler = function(e) {
      const dx = e.pageX - origin.x;
      const dy = e.pageY - origin.y;
      if (east) {
        el.style.width = Math.round(bcr.width + dx) + 'px';
      }
      let top = bcr.top;
      let left = bcr.left;
      let setLoc = false;
      if (west) {
        el.style.width = Math.round(bcr.width - dx) + 'px';
        left += dx;
        setLoc = true;
      }
      if (south) {
        el.style.height = Math.round(bcr.height + dy) + 'px';
      }
      if (north) {
        el.style.height = Math.round(bcr.height - dy) + 'px';
        top += dy;
        setLoc = true;
      }
      if (setLoc) {
        el.style.left = left + 'px';
        el.style.top = top + 'px';
      }
      if (onResize !== undefined) {
        onResize(el);
      }
      e.preventDefault();
    };
    if (this.controlGlobalListeners) {
      const moveListener = e => {
        if (this.moveHandler) {
          this.moveHandler(e);
        }
      };
      const quitListener = e => {
        this.moveHandler = null;
        document.removeEventListener("mousemove", moveListener);
        document.removeEventListener("mouseup", quitListener);
      };
      document.addEventListener("mousemove", moveListener);
      document.addEventListener("mouseup", quitListener);
    }
  }


  registerResize (el, dirMask, capturingBuffer = 5, onResize = NOOP) {
    const wm = this;
    const north = _maskTest(dirMask, DIRECTIONS.NORTH);
    const south = _maskTest(dirMask, DIRECTIONS.SOUTH);
    const west = _maskTest(dirMask, DIRECTIONS.WEST);
    const east = _maskTest(dirMask, DIRECTIONS.EAST);

    const borderTop = capturingBuffer;
    const borderLeft = capturingBuffer;

    function onNorthEdge(e) {
      return e.pageY < el.offsetTop + borderTop;
    }

    function onSouthEdge(e) {
      return e.pageY > el.offsetTop + el.offsetHeight - borderTop;
    }

    function onWestEdge(e) {
      return e.pageX < el.offsetLeft + borderLeft;
    }

    function onEastEdge(e) {
      return e.pageX > el.offsetLeft + el.offsetWidth - borderLeft;
    }


    el.addEventListener('mousedown', function(e) {
      if (north && east && onNorthEdge(e) && onEastEdge(e)) {
        wm.captureResize(el, DIRECTIONS.NORTH | DIRECTIONS.EAST, e, onResize);
      } else if (north && west && onNorthEdge(e) && onWestEdge(e)) {
        wm.captureResize(el, DIRECTIONS.NORTH | DIRECTIONS.WEST, e, onResize);
      } else if (south && east && onSouthEdge(e) && onEastEdge(e)) {
        wm.captureResize(el, DIRECTIONS.SOUTH | DIRECTIONS.EAST, e, onResize);
      } else if (south && west && onSouthEdge(e) && onWestEdge(e)) {
        wm.captureResize(el, DIRECTIONS.SOUTH | DIRECTIONS.WEST, e, onResize);
      } else if (north && onNorthEdge(e)) {
        wm.captureResize(el, DIRECTIONS.NORTH, e, onResize);
      } else if (south && onSouthEdge(e)) {
        wm.captureResize(el, DIRECTIONS.SOUTH, e, onResize);
      } else if (west && onWestEdge(e)) {
        wm.captureResize(el, DIRECTIONS.WEST, e, onResize);
      } else if (east && onEastEdge(e)) {
        wm.captureResize(el, DIRECTIONS.EAST, e, onResize);
      }
    });

    el.addEventListener('mousemove', function(e) {
      if (north && east && onNorthEdge(e) && onEastEdge(e)) {
        el.style.cursor = 'nesw-resize';
      } else if (north && west && onNorthEdge(e) && onWestEdge(e)) {
        el.style.cursor = 'nwse-resize';
      } else if (south && east && onSouthEdge(e) && onEastEdge(e)) {
        el.style.cursor = 'nwse-resize';
      } else if (south && west && onSouthEdge(e) && onWestEdge(e)) {
        el.style.cursor = 'nesw-resize';
      } else if (south && onSouthEdge(e)) {
        el.style.cursor = 'ns-resize';
      } else if (north && onNorthEdge(e)) {
        el.style.cursor = 'ns-resize';
      } else if (east && onEastEdge(e)) {
        el.style.cursor = 'ew-resize';
      } else if (west && onWestEdge(e)) {
        el.style.cursor = 'ew-resize';
      } else {
        el.style.cursor = '';
      }
    });
  }
}

export const DIRECTIONS = {
  NORTH : 0x0001,
  SOUTH : 0x0010,
  WEST :  0x0100,
  EAST :  0x1000,
};


function _maskTest(mask, value) {
  return (mask & value) === value;
}

export function WindowControlButton({danger, ...props}: {
  danger?: boolean;
  children: any;
  onClick: (e: any) => any;
  } & React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx(ls.button, danger&&ls.danger)} {...props} />;
}
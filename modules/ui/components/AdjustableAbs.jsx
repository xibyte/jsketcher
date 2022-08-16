import React from 'react';

export default function AdjustableAbs(props) {
  if (!props.visible) {
    return null;
  }
  return <Adjuster {...props}/>
}

export class Adjuster extends React.Component {
  
  fit = () => {
    if (!this.el) {
      return;
    }
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    const holder = document.documentElement;

    const fit = (prop, pos, dim, holderDim) => {
      if (pos !== undefined) {
        if (pos + dim > holderDim) {
          pos = (holderDim - dim) - 5;
        }
        this.el.style[prop] = Math.round(pos) + 'px';
      }
    };

    let {left, top, right, bottom, centered} = this.props;

    if (centered) {
      if (right !== undefined) {
        right = (right + w * 0.5); 
      } 
      if (left !== undefined) {
        left = (left - w * 0.5);
      }
      if (bottom !== undefined) {
        bottom = (bottom + h * 0.5);
      }
      if (top !== undefined) {
        top = (top - h * 0.5);
      }
    }
    
    fit('left', left, w, holder.clientWidth);
    fit('right', right,w, holder.clientWidth);
    fit('top',  top, h, holder.clientHeight);
    fit('bottom', bottom, h, holder.clientHeight);
    this.el.style.visibility = 'visible';
  };
  
  componentDidMount() {
    setTimeout(this.fit);
  }

  componentWillUnmount() {
    this.el = undefined;
  }
  
  render() {
    const {left, top, right, bottom, children, style, zIndex, visible, centered, ...props} = this.props;
    return <div ref={el => this.el = el} 
                style={{
                  visibility: 'hidden',
                  position: 'fixed', zIndex,
                  ...style}}  {...props}>
      {children}
    </div>;
  }
}

AdjustableAbs.defaultProps = {
  zIndex: 100,
  visible: true
};




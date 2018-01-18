import React from 'react';

export default class AdjustableAbs extends React.Component {
  
  fit() {
    if (!this.el) {
      return;
    }
    let w = this.el.offsetWidth;
    let h = this.el.offsetHeight;
    let holder = this.el.parentNode;

    const fit = (prop, dim, holderDim) => {
      let pos = this.props[prop];
      if (pos !== undefined) {
        if (pos + dim > holderDim) {
          pos = holderDim - dim;
          this.el.style[prop] = pos + 'px';
        }
      }
    };

    fit('left', w, holder.offsetWidth);
    fit('right', w, holder.offsetWidth);
    fit('top',  h, holder.offsetHeight);
    fit('bottom', h, holder.offsetHeight);
  }
  
  componentDidMount() {
    this.fit();
  }

  componentDidUpdate() {
    this.fit();
  }

  componentWillUnmount() {
    this.el = undefined;
  }
  
  render() {
    let {left, top, right, bottom, children, style, zIndex, visible, ...props} = this.props;
    return <div ref={el => this.el = el} 
                style={{
                  display: visible ? 'block' : 'none',
                  position: 'absolute', left, top, right, bottom, zIndex, 
                  ...style}}  {...props}>
      {children}
    </div>;
  }
}

AdjustableAbs.defaultProps = {
  zIndex: 100,
  visible: true
};




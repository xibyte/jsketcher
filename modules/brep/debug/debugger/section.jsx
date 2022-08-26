import React from 'react';
import cx from 'classnames';


export default class Section extends React.PureComponent {

  constructor() {
    super();
    this.state = {
      closed: null
    }
  }

  render() {
    const {name, tabs, closable, defaultClosed, accent, children, captionStyles, controls} = this.props;
    const closed = this.isClosed();
    return <div className={cx('section', {closable, closed})} style={{paddingLeft: tabs + 'em'}}>
      <div className={cx('caption', {accent}, captionStyles)} >
        <span className='title' onClick={closable ? this.tweakClose : undefined}>
          {closable && <i className={cx('fa fa-fw fa-caret-' + (closed ? 'right': 'down'), {'invisible': !children} )} />} {name}
        </span>
        <span className='control'>{controls}</span>
      </div>
      {!closed && children}
    </div>;
  }

  isClosed() {
    const {closable, defaultClosed} = this.props;
    if (!closable) return false;
    return closable && (this.state.closed === null ? defaultClosed : this.state.closed)
  }

  tweakClose = () => {
    this.setState({closed: !this.isClosed()});
  }

}

function mapIterator(it, fn) {
  for (const i of it) {
    fn(i);
  }
}



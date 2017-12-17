import React from 'react';
import cx from 'classnames';


export default class Section extends React.PureComponent {

  constructor() {
    super();
    this.state = {
      closed: false
    }
  }

  render() {
    let {name, tabs, closable, defaultClosed, accent, children, captionStyles} = this.props;
    let closed = closable && (this.state.closed || defaultClosed);
    return <div className={cx('section', {closable, closed})} style={{paddingLeft: tabs}}>
      <div className={cx('caption', {accent}, captionStyles)} >
        {closable && <i className={'fa fa-fw fa-caret-' + (closed ? 'right': 'down')} />} {name}</div>
        {children}
    </div>;
  }
}

function mapIterator(it, fn) {
  for (let i of it) {
    fn(i);
  }
}



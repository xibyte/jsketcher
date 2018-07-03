import React from 'react';
import ls from './Section.less';
import Fa from './Fa';

export const TabContext = React.createContext(0);

export class Section extends React.PureComponent {

  constructor({defaultClosed}) {
    super();
    this.state = {
      closed: defaultClosed
    }
  }

  render() {
    let {label, closable, children} = this.props;
    let closed = this.isClosed();
    return <TabContext.Consumer>
      {
        tabs => <div className={ls.section} style={{paddingLeft: 10}}>
          <TabContext.Provider value={tabs + 1}>
            <div className={ls.header}>
            <span className={ls.handle} onClick={closable ? this.tweakClose : undefined}>
              <Fa fw icon={closable && children ? ('caret-' + (closed ? 'right' : 'down')) : null}/>
            </span>
              <span className={ls.label}>{label}</span>
            </div>
            {!closed && children}
          </TabContext.Provider>
        </div>
      }
    </TabContext.Consumer>;
  }

  isClosed() {
    let {closable} = this.props;
    if (!closable) return false;
    return closable && this.state.closed;
  }

  tweakClose = () => {
    this.setState({closed: !this.isClosed()});
  }
}



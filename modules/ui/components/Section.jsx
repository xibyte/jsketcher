import React from 'react';
import ls from './Section.less';
import Fa from './Fa';

export const TabContext = React.createContext(0);

export class Section extends React.PureComponent {

  constructor({defaultOpen}) {
    super();
    this.state = {
      closed: !defaultOpen
    };
  }

  render() {
    let {label, nonClosable, children} = this.props;
    let closed = this.isClosed();
    return <TabContext.Consumer>
      {
        tabs => <div className={ls.section} style={{paddingLeft: 10}}>
          <TabContext.Provider value={tabs + 1}>
            <div className='sectionHeader'>
              <span className={ls.handle} onClick={!nonClosable ? this.tweakClose : undefined}>
                <Fa fw icon={!nonClosable && children && children.length !== 0 ? ('caret-' + (closed ? 'right' : 'down')) : null}/>
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
    let {nonClosable} = this.props;
    if (nonClosable) return false;
    return this.state.closed;
  }

  tweakClose = () => {
    this.setState({closed: !this.isClosed()});
  };
}



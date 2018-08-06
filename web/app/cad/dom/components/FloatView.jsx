import React from 'react';
import ObjectExplorer from '../../craft/ui/ObjectExplorer';
import OperationHistory from '../../craft/ui/OperationHistory';
import Folder from 'ui/components/Folder';
import Fa from '../../../../../modules/ui/components/Fa';
import ls from './FloatView.less';
import cx from 'classnames';

export default class FloatView extends React.Component {

  state = {
    selected: null
  };

  render() {
    return <div className={ls.root}>
      <div className={ls.tabs}>
        {['project', 'history'].map(tabId => <Tab selected={this.state.selected === tabId} key={tabId}
                                                  onClick={() => this.setState({selected: this.state.selected === tabId ? null : tabId})}>{getIcon(tabId)}</Tab>)}
      </div>
      
      {this.state.selected && <div className={ls.main}>
        {this.state.selected === 'project' && <Folder title={<span> <Fa fw icon='cubes'/> Model</span>}>
          <ObjectExplorer/>
        </Folder>}
        {this.state.selected === 'history' && <Folder title={<span> <Fa fw icon='history'/> Modifications</span>}>
          <OperationHistory/>
        </Folder>}

      </div>}
    </div>;
  }
}

function Tab({children, selected, onClick}) {
  return <div className={cx(ls.tab, selected && ls.selected)} onClick={onClick}>{children}</div>;
}

function getIcon(id) {
  if (id === 'history') {
    return <Fa fw icon='history'/>;
  } else if (id === 'project') {
    return <Fa fw icon='cubes'/>;
  }
}
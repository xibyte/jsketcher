import React from 'react';
import Folder from 'ui/components/Folder';
import ls from './FloatView.less';
import connect from 'ui/connect';
import mapContext from 'ui/mapContext';
import Fa from 'ui/components/Fa';
import ToolButton from 'ui/components/ToolButton';

@connect(state => state.ui.floatViews.map(views => ({views})))
@mapContext(ctx => ({
  getDescriptor: ctx.services.ui.getFloatView,
  initialView: ctx.services.project.hints.FloatView || null
}))
export default class FloatView extends React.Component {

  
  constructor(props) {
    super();
    this.state = {
      selected: props.initialView
    };
  }
  

  render() {
    let {views, getDescriptor} = this.props;
    
    function view(id) {
      let {title, icon, Component} = getDescriptor(id);
      return <Folder className={ls.folder} title={<span> <Fa fw icon={icon}/> {title}</span>}>
        <div className={ls.folderContent}><Component/></div>
      </Folder>;
    }

    function icon(id) {
      let {Icon} = getDescriptor(id);
      return <Icon />
    }

    let selected = this.state.selected;
    
    return <div className={ls.root}>
      <div className={ls.tabs}>
        {views.map(tabId => <ToolButton pressed={selected === tabId} 
                                        key={tabId}
                                        onClick={() => this.setState({selected: selected === tabId ? null : tabId})}>
          {<Fa fw icon={getDescriptor(tabId).icon}/>}
        </ToolButton>)}
      </div>
      
      {selected && view(selected)}
        
    </div>;
  }
}
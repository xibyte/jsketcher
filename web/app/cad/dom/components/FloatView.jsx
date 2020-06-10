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
  initialView: ctx.projectService.hints.FloatView || null
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

    function renderedIcon(icon) {
      if (typeof icon === 'string') {
        return <Fa fw icon={icon}/>;
      }  else {
        const I = icon;
        return <I />;
      }
    }

    function view(id) {
      let {title, icon, Component} = getDescriptor(id);


      return <Folder className={ls.folder} title={<span> {renderedIcon(icon)} {title}</span>}>
        <div className={ls.folderContent}><Component/></div>
      </Folder>;
    }



    let selected = this.state.selected;
    
    return <div className={ls.root}>
      <div className={ls.tabs}>
        {views.map(tabId => <ToolButton pressed={selected === tabId} 
                                        key={tabId}
                                        className='float-view-btn'
                                        data-view={tabId}
                                        onClick={() => this.setState({selected: selected === tabId ? null : tabId})}>
          {renderedIcon(getDescriptor(tabId).icon)}
        </ToolButton>)}
      </div>
      
      {selected && view(selected)}
        
    </div>;
  }
}
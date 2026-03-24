import React from 'react';
import Folder from 'ui/components/Folder';
import ls from './FloatView.less';
import connect from 'ui/connect';
import mapContext from 'ui/mapContext';
import Fa from 'ui/components/Fa';
import ToolButton from 'ui/components/ToolButton';

const SIDEBAR_BG_COLORS = {
  dark:   { tabs: '46,46,56',    folder: '22,22,28'    },
  medium: { tabs: '58,58,72',    folder: '46,46,56'    },
  light:  { tabs: '210,210,220', folder: '230,230,240' },
};

function computeSidebarStyle() {
  try {
    const saved = JSON.parse(localStorage.getItem('ForgeCAD.settings') || '{}');
    const theme = saved.theme || 'dark';
    const opacity = 1 - (saved.sidebarTransparency ?? 0) / 100;
    const blur = saved.sidebarBlur ?? 0;
    const colors = SIDEBAR_BG_COLORS[theme] || SIDEBAR_BG_COLORS.dark;
    return {
      tabsBg: `rgba(${colors.tabs},${opacity})`,
      folderBg: `rgba(${colors.folder},${opacity})`,
      backdropFilter: blur > 0 ? `blur(${blur}px)` : 'none',
    };
  } catch(e) {
    return { tabsBg: 'rgba(46,46,56,0.92)', folderBg: 'rgba(22,22,28,0.97)', backdropFilter: 'none' };
  }
}

@connect(state => state.ui.floatViews.map(views => ({views})))
@mapContext(ctx => ({
  getDescriptor: ctx.services.ui.getFloatView,
  initialView: ctx.projectService.hints.FloatView || null
}))
export default class FloatView extends React.Component {

  constructor(props) {
    super();
    const saved = localStorage.getItem('FloatView.selected');
    this.state = {
      selected: (saved !== null && saved !== '') ? saved : (props.initialView || null),
      sidebar: computeSidebarStyle(),
    };
    this._onSidebarStyle = (e) => this.setState({ sidebar: e.detail });
  }

  componentDidMount() {
    window.addEventListener('forgecad-sidebar-style', this._onSidebarStyle);
  }

  componentWillUnmount() {
    window.removeEventListener('forgecad-sidebar-style', this._onSidebarStyle);
  }

  render() {
    const {views, getDescriptor} = this.props;
    const { sidebar } = this.state;

    const btnStyle = (isSelected) => isSelected
      ? { backgroundColor: '#4d9cf8', backdropFilter: sidebar.backdropFilter, color: '#fff' }
      : { backgroundColor: sidebar.tabsBg, backdropFilter: sidebar.backdropFilter };
    const folderStyle = { background: sidebar.folderBg, backdropFilter: sidebar.backdropFilter };

    function renderedIcon(icon) {
      if (typeof icon === 'string') {
        return <Fa fw icon={icon}/>;
      } else {
        const I = icon;
        return <I />;
      }
    }

    const view = (id) => {
      const descriptor = getDescriptor(id);
      if (!descriptor) return null;
      const {title, icon, Component} = descriptor;
      if (id === 'scene') {
        return <div className={ls.folder} style={{background:'transparent',border:'none',boxShadow:'none',backdropFilter:'none'}}>
          <div className={ls.folderContent} style={{scrollbarWidth:'none', msOverflowStyle:'none'}}><Component/></div>
        </div>;
      }
      return <Folder className={ls.folder} style={folderStyle} title={<span> {renderedIcon(icon)} {title}</span>}>
        <div className={ls.folderContent}><Component/></div>
      </Folder>;
    };

    const selected = this.state.selected;

    return <div className={ls.root} data-panel-open={selected ? 'true' : 'false'}>
      <div className={ls.tabs}>
        {views.map(tabId => <ToolButton key={tabId}
                                        className='float-view-btn'
                                        data-view={tabId}
                                        style={btnStyle(selected === tabId)}
                                        onClick={() => {
          const next = selected === tabId ? null : tabId;
          localStorage.setItem('FloatView.selected', next || '');
          this.setState({selected: next});
        }}>
          {renderedIcon(getDescriptor(tabId).icon)}
        </ToolButton>)}
      </div>

      {selected && view(selected)}

    </div>;
  }
}

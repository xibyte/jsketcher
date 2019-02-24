import React from 'react';
import mapContext from 'ui/mapContext';
import {Section} from 'ui/components/Section';
import Fa from 'ui/components/Fa';
import ls from './ProjectManager.less';
import {ContextMenu, ContextMenuItem} from 'ui/components/Menu';
import cmn from 'ui/styles/common.less';
import Button from '../../../../modules/ui/components/controls/Button';
import Folder from '../../../../modules/ui/components/Folder';

@mapContext(ctx => ({
  projectManager: ctx.services.projectManager
}))
export class ProjectManager extends React.Component {

  render() {
    let {projectManager} = this.props;
    let projects = projectManager.listProjects();
    return <div className={ls.root}>
      <Button className={ls.btn}><Fa fw icon='download' /> Download Project</Button>
      <Button className={ls.btn}><Fa fw icon='upload' /> Import Project</Button>
      <Folder title='Project List'>
        <div className={cmn.scrollable}>
          {projects.map(p => <Section key={p.id}
                                      label={<ContextMenu items={
                                        <React.Fragment>
                                          <ContextMenuItem label='Download' icon={<Fa fw icon='download' />} onClick={() => alert(1)}/>
                                          <ContextMenuItem label='Clone' icon={<Fa fw icon='copy' />} onClick={() => alert(1)}/>
                                          <ContextMenuItem label='Delete' icon={<Fa className={cmn.dangerColor} fw icon='remove' />} onClick={() => alert(1)}/>
                                        </React.Fragment>
                                      }>
                                        <a href={'?' + p.id} target="_blank"><Fa icon='file'/> {p.id}</a>
                                      </ContextMenu>}>
            {p.sketches.length && <Section label={<span><Fa icon='image'/> Sketches</span>} defaultOpen={true}>
              {p.sketches.map(sketch => <Section key={sketch} label={sketch}/>)} 
            </Section>}
          </Section>)}
        </div>
      </Folder>
    </div>
  }
  
}
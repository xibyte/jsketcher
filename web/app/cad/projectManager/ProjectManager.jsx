import React from 'react';
import mapContext from 'ui/mapContext';
import {Section} from 'ui/components/Section';
import Fa from 'ui/components/Fa';
import ls from './ProjectManager.less';
import {ContextMenu, ContextMenuItem} from 'ui/components/Menu';
import cmn from 'ui/styles/common.less';
import Folder from 'ui/components/Folder';
import connect from 'ui/connect';

@mapContext(ctx => ({
  projectManager: ctx.services.projectManager,
  download: projectId => ctx.services.projectManager.exportProject(projectId),
  clone: projectId => ctx.services.projectManager.cloneProject(projectId, true),
  rename: projectId => ctx.services.projectManager.renameProject(projectId, true),
  remove: projectId => ctx.services.projectManager.deleteProject(projectId),
}))
@connect(streams => streams.storage.update)
export class ProjectManager extends React.Component {

  render() {
    let {projectManager} = this.props;
    let projects = projectManager.listProjects();
    return <div className={ls.root}>
      <Folder title='Project List'>
        <div className={cmn.scrollable}>
          {projects.map(p => <Section key={p.id}
                                      label={<ContextMenu items={
                                        <React.Fragment>
                                          <ContextMenuItem label='Download' icon={<Fa fw icon='download' />} 
                                                           onClick={() => this.props.download(p.id)}/>
                                          <ContextMenuItem label='Clone' icon={<Fa fw icon='copy' />}
                                                           onClick={() => this.props.clone(p.id)}/>
                                          <ContextMenuItem label='Rename' icon={<Fa fw icon='pencil' />}
                                                           onClick={() => this.props.rename(p.id)}/>
                                          <ContextMenuItem label='Delete' icon={<Fa className={cmn.dangerColor} fw icon='remove' />} 
                                                           onClick={() => this.props.remove(p.id)}/>
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
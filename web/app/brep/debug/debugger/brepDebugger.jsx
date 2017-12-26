import React from 'react';
import './brepDebugger.less';
import BREP_DEBUG from '../brep-debug';
import ShellExplorer from './shellExplorer';
import LoopDetectionExplorer from './loopDetectionExplorer';
import Section from './section'
import {EdgeTransferExplorer} from "./edgeTransferExplorer";
import {FaceFilterExplorer} from "./faceFilterExplorer";

export default class BrepDebugger extends React.PureComponent {

  render() {
    let {booleanSessions} = BREP_DEBUG;          
    let {brepDebugGroup} = this.props;
    function hideAll() {
      for (let obj of brepDebugGroup.children) {
        obj.visible = false;
      }
      __DEBUG__.render();
    }
    return <div className='brep-debugger'>
      <div className='section'>
        <i className='fa fa-fw fa-eye button grayed' onClick={hideAll} />{' '}
        <i className='fa fa-fw fa-cubes button grayed' onClick={() => __DEBUG__.HideSolids()} />{' '} 
        <i className='fa fa-fw fa-cubes button' onClick={() => __DEBUG__.ShowSolids()} />
        <i className='fa fa-fw fa-refresh button' onClick={() => this.forceUpdate()} />
      </div>

      <div className='section boolean-sessions'>
      {booleanSessions.map(session => 
        <Section key={session.id} name={`boolean session ${session.id} - ${session.type}`} closable accent captionStyles={['centered']}>
          <div className='section'>

            <Section name='input operands' accent>
              <div className='operands-veiew'> 
                <div>
                  <div className='caption operand-a'>Operand A</div>
                  <ShellExplorer shell={session.inputOperandA} group3d={brepDebugGroup}/>
                </div>
                <div>
                  <div className='caption operand-b'>Operand B</div>
                  <ShellExplorer shell={session.inputOperandB} group3d={brepDebugGroup}/>
                </div>
              </div>
            </Section>

          </div>

          <Section name='working operands' accent>
            <div className='operands-veiew'> 
              <div>
                <div className='caption operand-a'>Operand A</div>
                <ShellExplorer shell={session.workingOperandA} group3d={brepDebugGroup}/>
              </div>
              <div>
                <div className='caption operand-b'>Operand B</div>
                <ShellExplorer shell={session.workingOperandB} group3d={brepDebugGroup}/>
              </div>
              <div>
                <div className='caption result'>Result</div>
                <ShellExplorer shell={session.result} group3d={brepDebugGroup}/>
              </div>
            </div>
          </Section>

          
          <Section name='loops detection' accent>
            {session.loopDetection.map(ld => <LoopDetectionExplorer key={ld.id} loopDetection={ld} group3d={brepDebugGroup} />)}  
          </Section>

          <Section name='edge transfer' accent>
            {session.transferedEdges.map((et, i) => <EdgeTransferExplorer key={i} {...et} index={i} group3d={brepDebugGroup} />)}
          </Section>
          
          <Section name='edge intersections' accent>
            edge intersections...
          </Section>
          <Section name='face merge' accent>
            face merge...
          </Section>

          <Section name='face intersections' accent>
            face intersections...
          </Section>

          <Section name='loops validation' accent>
            loops validation...
          </Section>
          <Section name='face filter' accent>
            {session.faceFilter && <FaceFilterExplorer {...session.faceFilter} group3d={brepDebugGroup} /> } 
          </Section>
        </Section>)}
      </div> 
    </div>;
  }

}



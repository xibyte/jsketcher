import React from 'react';
import './brepDebugger.less';
import BREP_DEBUG from '../brep-debug';
import ShellExplorer from './shellExplorer';
import Section from './section'

export default class BrepDebugger extends React.PureComponent {

  render() {
    let {booleanSessions} = BREP_DEBUG;          
    let {brepDebugGroup} = this.props;
    return <div className='brep-debugger'>
      <div className='section'>
        <i className='fa fa-fw fa-eye-slash button' onClick={() => __DEBUG__.HideSolids()} />
      </div>

      <div className='section boolean-sessions'>
      {booleanSessions.map(session => 
        <Section name={`boolean session ${session.id}`} closable accent captionStyles={['centered']}>
          <div className='section'>

            <Section name='input operands' accent>
              <div className='operands-veiew'> 
                <div>
                  <div className='caption operand-a'>Operand A</div>
                  <ShellExplorer shell={session.inputOperandA} groups3d={brepDebugGroup}/>
                </div>
                <div>
                  <div className='caption operand-b'>Operand B</div>
                  <ShellExplorer shell={session.inputOperandB} groups3d={brepDebugGroup}/>
                </div>
              </div>
            </Section>

          </div>

          <Section name='working operands' accent>
            <div className='operands-veiew'> 
              <div>
                <div className='caption operand-a'>Operand A</div>
                <ShellExplorer shell={session.workingOperandA} groups3d={brepDebugGroup}/>
              </div>
              <div>
                <div className='caption operand-b'>Operand B</div>
                <ShellExplorer shell={session.workingOperandB} groups3d={brepDebugGroup}/>
              </div>
              <div>
                <div className='caption result'>Result</div>
                <ShellExplorer shell={session.result} groups3d={brepDebugGroup}/>
              </div>
            </div>
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
          <Section name='loops detection' accent>
            loops detection...
          </Section>
          <Section name='loops validation' accent>
            loops validation...
          </Section>
          <Section name='loops filter' accent>
            loops filter...
          </Section>
          

        </Section>)}
      </div> 
    </div>;
  }

}



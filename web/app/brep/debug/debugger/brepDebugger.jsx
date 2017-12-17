import React from 'react';
import './brepDebugger.less';
import BREP_DEBUG from '../brep-debug';
import ShellExplorer from './shellExplorer';
import Section from './section'

export default class BrepDebugger extends React.PureComponent {

  render() {
    let {booleanSessions} = BREP_DEBUG;          

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
                  <ShellExplorer shell={session.inputOperandA}/>
                </div>
                <div>
                  <div className='caption operand-b'>Operand B</div>
                  <ShellExplorer shell={session.inputOperandB}/>
                </div>
              </div>
            </Section>

          </div>

          <Section name='working operands' accent>
            <div className='operands-veiew'> 
              <div>
                <div className='caption operand-a'>Operand A</div>
                <ShellExplorer shell={session.workingOperandA}/>
              </div>
              <div>
                <div className='caption operand-b'>Operand B</div>
                <ShellExplorer shell={session.workingOperandB}/>
              </div>
              <div>
                <div className='caption result'>Result</div>
                <ShellExplorer shell={session.result}/>
              </div>
            </div>
          </Section>
        </Section>)}
      </div> 
    </div>;
  }

}



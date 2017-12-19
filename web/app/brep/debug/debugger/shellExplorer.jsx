import React from 'react';
import Section from "./section";

export default class ShellExplorer extends React.PureComponent {

  render() {
    let {shell} = this.props;

    let faceControls = <span>
      <i className='fa fa-fw fa-eye' onClick={alert}/>
      <i className='fa fa-fw fa-eye-slash' onClick={alert}/>
    </span>;  
    
    return <div className='shell-explorer'>
      
      <Section name='faces' closable>
        {shell.faces.map(face => <Section name={`face ${face.refId}`} tabs='0.5em' closable defaultClosed={true} controls={faceControls}>
            {mapIterator(face.edges, e => <div>
              edge: {e.refId}    
            </div>)}    
          </Section>)
        }
      </Section>
    </div>;
  }
}

function mapIterator(it, fn) {
  for (let i of it) {
    fn(i);
  }
}



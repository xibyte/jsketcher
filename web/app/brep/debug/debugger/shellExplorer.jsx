import React from 'react';

export default class ShellExplorer extends React.PureComponent {

  render() {
    let {shell} = this.props;
    return <div className='shell-explorer'>
      <div className='caption'>faces</div>
      {shell.faces.map(face => <div>
        <div className='caption'>face {face.refId}</div>
        {mapIterator(face.edges, e => <div>
          edge: {e.refId}    
        </div>)}    
      </div>)
      }
    </div>;
  }
}

function mapIterator(it, fn) {
  for (let i of it) {
    fn(i);
  }
}



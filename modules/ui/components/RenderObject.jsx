import React from 'react';
import ls from './RenderObject.less';

export default function RenderObject({object}) {
  return <div className={ls.root}><RenderObjectImpl object={object}/></div>
}

function RenderObjectImpl({object, inner}) {
  if (object === undefined || object === null) {
    return <span>{object}</span>;
  }
  if (typeof object === 'object') {
    return <div style={{marginLeft: inner?10:0}}>
      {Object.keys(object).map(field => <div key={field}>
        {field}: <RenderObjectImpl object={object[field]} inner/>
      </div>)}
    </div>;
  } else if (Array.isArray(object)) {
    return <div style={{marginLeft: inner?10:0}}>
      {object.map((item, i) => <div key={i}>
        <div><RenderObject object={object[item]} inner/></div>
      </div>)}
    </div>;
  } else {
    return <span>{object}</span>;
  }
}
import React from 'react';
import {useStream} from "ui/effects";
import {SELECTABLE_ENTITIES} from "../../scene/entityContextPlugin";


export function SelectionView() {

  const selections = [];
  SELECTABLE_ENTITIES.forEach(entity => {
    selections.push(useStream(ctx => ctx.streams.selection[entity]));
  });


  return <div className='selection-view'>

    {SELECTABLE_ENTITIES.map((entity, i) => {

      const selection = selections[i];

      if (selection.length === 0) {
        return null;
      }


      return <div>
        <b>{entity}</b>
        <ul data-entity={entity} key={entity} style={{marginLeft: 10}}>

          {selection.map(id => <li>{id}</li>)}

        </ul>
      </div>

    })}

  </div>
}
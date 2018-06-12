import React from 'react';

import TextControl from "ui/components/controls/TextControl";
import Folder from '../../../../../../modules/ui/components/Folder';
import MDForm from './MDForm';

export default function EdgesSelectionControl({label, edges, onUpdate, itemMetadata}, {services}) {
  return <Folder title={label}>
    {edges.map((subParams, i) => 
      <MDForm metadata={itemMetadata} params={subParams} onUpdate={onUpdate} key={i} />
    )}
  </Folder>;
}


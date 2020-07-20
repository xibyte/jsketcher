import React from 'react';
import mapContext from 'ui/mapContext';
import Button from 'ui/components/controls/Button';

export default function initReassignSketchMode(ctx) {
  ctx.services.ui.registerComponent('ReassignSketchTool', ReassignSketchTool);


  let detach = null;
  
  function exit() {
    ctx.streams.ui.sockets.headsUpHelper.next(null);
    if (detach) {
      detach();
      detach = null;
    }
  }

  function enter(fromId) {
    ctx.streams.ui.sockets.headsUpHelper.next('ReassignSketchTool');
    detach = ctx.streams.selection.face.attach(faces => {
      let face = faces[0];
      if (face && face !== fromId) {
        exit();
        ctx.services.sketcher.reassignSketch(fromId, face);
      }
    });
  }
  return {enter, exit};
}

function ReassignSketchTool({from, cancel}) {
  return <div style={{
    margin: 10
  }}>
    Reassign sketch from {from}. Pick a target face. <Button onClick={cancel}>cancel</Button>
  </div>;
}

ReassignSketchTool = mapContext(ctx => ({
  from: ctx.services.selection.face.single.id,
  cancel: ctx.services.sketcher.reassignSketchMode.exit
}))(ReassignSketchTool);

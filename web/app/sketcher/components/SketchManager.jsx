import React, {useContext, useMemo, useState} from 'react';
import {SketcherAppContext} from "./SketcherApp";
import {useStreamWithUpdater} from "ui/effects";
import Window, {DIRECTIONS} from "ui/components/Window";
import App2D from "../sketcher-app";
import Stack from "ui/components/Stack";
import Button from "ui/components/controls/Button";
import {RiDeleteBinLine} from "react-icons/ri";

export function SketchManager() {

  const [request, setRequest] = useStreamWithUpdater(ctx => ctx.ui.$sketchManagerRequest);

  if (!request) {
    return null;
  }
  const x = request.x || 200;
  const y = request.y || 200;
  const DIRS = DIRECTIONS;
  return <Window title='Sketches' initHeight={300}  initLeft={x} initTop={y}
                 className='sketcher-window'
                 resize={DIRS.NORTH | DIRS.SOUTH | DIRS.WEST | DIRS.EAST}
                 resizeCapturingBuffer={5}
                 onClose={() => setRequest(null)}>
    <SketchList />
  </Window>
}


function SketchList() {
  const [modification, setModification] = useState( 0);
  const {app} = useContext(SketcherAppContext);

  const items = useMemo(() => {
    let theItems = [];
    for (let name in localStorage) {
      if (!localStorage.hasOwnProperty(name)) {
        continue;
      }
      if (name.indexOf(App2D.STORAGE_PREFIX) === 0) {
        name = name.substring(App2D.STORAGE_PREFIX.length);
      }
      theItems.push(name);
    }
    return theItems;
  }, [modification]);


  return <Stack>
    {items.map(item => <div key={item} style={listStyle} className='hover'
                            onClick={() => app.openSketch(item)}>
      {item}

      <Button style={{marginLeft: 5}} type='danger'><RiDeleteBinLine onClick={e => {
        e.stopPropagation();
        if (confirm("Selected sketch will be REMOVED! Are you sure?")) {
          localStorage.removeItem(App2D.STORAGE_PREFIX + item);
          setModification(m => m + 1);
        }
      }}/> </Button>
    </div>)}
  </Stack>;
}

const listStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 12,
  cursor: 'pointer'
};
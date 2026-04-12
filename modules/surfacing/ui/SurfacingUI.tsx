import React, {useState, useEffect} from 'react';
import {surfacingState$} from '../surfacingBundle';
import type {SurfacingEditor} from '../SurfacingEditor';
import {DefaultTool, type DefaultToolState} from '../tools/defaultTool';
import {BridgeTool, type BridgeToolState} from '../ops/bridge/bridge.tool';
import {FillHoleTool, type FillHoleToolState} from '../ops/fillHole/fillHole.tool';
import {SurfacePropsPanel} from './SurfacePropsPanel';
import {EdgePropsPanel} from './EdgePropsPanel';
import {ArcDialog} from './ArcDialog';
import {ModeGuide} from './ModeGuide';

export function SurfacingUI() {
  const [, setTick] = useState(0);
  const editor: SurfacingEditor | null = (surfacingState$.value?.scene as any)?.ctx ?? null;

  // Re-render when tool changes or tool state updates
  useEffect(() => {
    if (!editor) return;
    const unsubs: (() => void)[] = [];
    unsubs.push(editor.toolChanged$.attach(() => setTick(t => t + 1)));

    const subToTool = () => {
      const tool = editor.currentTool;
      if (tool?.state$) {
        return tool.state$.attach(() => setTick(t => t + 1));
      }
      return () => {};
    };

    let toolUnsub = subToTool();
    unsubs.push(editor.toolChanged$.attach(() => {
      toolUnsub();
      toolUnsub = subToTool();
    }));

    return () => {
      toolUnsub();
      unsubs.forEach(u => u());
    };
  }, [editor]);

  if (!editor) return null;

  const tool = editor.currentTool;

  if (tool instanceof DefaultTool) {
    const s: DefaultToolState = tool.state$.value;
    return <>
      {s.selectedSurface && <SurfacePropsPanel tool={tool} state={s} />}
      {s.selectedCurve && <EdgePropsPanel tool={tool} state={s} />}
      {s.arcDialog && <ArcDialog tool={tool} state={s} />}
    </>;
  }

  if (tool instanceof BridgeTool) {
    const s: BridgeToolState = tool.state$.value;
    return <ModeGuide
      title="Bridge Surface"
      hint="Click two edges · Tab=flip · G=G1 · Esc=cancel"
      g1={s.g1}
      onG1Toggle={() => tool.toggleG1()}
      onFlip={() => tool.flip()}
    />;
  }

  if (tool instanceof FillHoleTool) {
    const s: FillHoleToolState = tool.state$.value;
    return <ModeGuide
      title="Fill Hole"
      hint="Hover edge to preview · Click=fill · G=G1 · Esc=cancel"
      g1={s.g1}
      onG1Toggle={() => tool.toggleG1()}
    />;
  }

  return null;
}

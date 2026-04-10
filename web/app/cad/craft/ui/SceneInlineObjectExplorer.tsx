import React, {useState, useEffect, useMemo} from 'react';
import {MShell} from 'cad/model/mshell';
import {MDatum} from 'cad/model/mdatum';
import {MOpenFaceShell} from "cad/model/mopenFace";
import {MPatchCage} from "cad/model/mpatchcage";
import {MSurfacingScene} from "surfacing/models/MSurfacingScene";
import {useStream, useStreamWithPatcher} from "ui/effects";
import {MObject} from "cad/model/mobject";
import {SceneInlineDelineation, SceneInlineSection} from "ui/components/SceneInlineSection";
import {GenericExplorerControl, GenericExplorerNode} from "ui/components/GenericExplorer";
import ls from "cad/craft/ui/ObjectExplorer.less";
import Fa from "ui/components/Fa";
import {AiOutlineEye, AiOutlineEyeInvisible} from "react-icons/ai";
import {ModelButtonBehavior} from "cad/craft/ui/ModelButtonBehaviour";
import {ModelAttributes} from "cad/attributes/attributesService";
import {EntityTreeNode} from "surfacing/models/EntityTreeNode";
import {sceneFromPatchCage} from "surfacing/models/Scene/fromPatchCage";


export function SceneInlineObjectExplorer() {

  const models = useStream(ctx => ctx.craftService.models$);

  if (!models) {
    return null;
  }

  return <SceneInlineSection title='OBJECTS'> {models.map(m => {
    if (m instanceof MOpenFaceShell) {
      return <OpenFaceSection shell={m} key={m.id} />
    } else if (m instanceof MShell) {
      return <ModelSection model={m} key={m.id} controlVisibility>
        <Section label='faces' defaultOpen={true}>
          {
            m.faces.map(f => <FaceSection face={f} key={f.id}/>)
          }
        </Section>
        <Section label='edges' defaultOpen={true}>
          {m.edges.map(e => <EdgeSection edge={e} key={e.id}/>)}
        </Section>

      </ModelSection>
    } else if (m instanceof MDatum) {
      return <ModelSection model={m} key={m.id} controlVisibility/>;
    } else if (m instanceof MSurfacingScene) {
      return <SurfacingSceneSection model={m} key={m.id} />;
    } else if (m instanceof MPatchCage) {
      return <PatchCageSection patchCage={m} key={m.id} />;
    } else {
      return null;
    }
  })}
  </SceneInlineSection>
}

function EdgeSection({edge}) {
  return <ModelSection model={edge} key={edge.id}>
    {edge.adjacentFaces.map(f => <FaceSection face={f} key={f.id}/>)}
  </ModelSection>
}

function FaceSection({face}) {
  return <ModelSection model={face} key={face.id}>

    {(face.productionInfo && face.productionInfo.role) &&
    <Section label={<span>role: {face.productionInfo.role}</span>}/>}
    {(face.productionInfo && face.productionInfo.originatedFromPrimitive) &&
    <Section label={<span>origin: {face.productionInfo.originatedFromPrimitive}</span>}/>}
    <SketchesList face={face}/>
    {face.edges && <Section label='edges' defaultOpen={false}>
      {face.edges.map(e => <EdgeSection edge={e} key={e.id}/>)}
    </Section>}
  </ModelSection>;
}

function SketchesList({face}) {
  return <Section
    label={face.sketchObjects.length ? 'sketch' : <span className={ls.hint}>{'<no sketch assigned>'}</span>}>
    {face.sketchObjects.map(o => <ModelSection
      key={o.id}
      model={o}
      expandable={false}
    />)}
  </Section>;
}


export function ModelSection({model, expandable = true, controlVisibility = false, ...props}: {
  model: MObject,
  children?: any,
  controlVisibility?: boolean,
  expandable?: boolean,
}) {

  return <ModelButtonBehavior model={model} controlVisibility={controlVisibility}>
    {behavior => <GenericExplorerNode defaultExpanded={false}
                                   expandable={expandable}
                                   label={behavior.label}
                                   selected={behavior.selected}
                                   select={behavior.select}
                                   highlighted={behavior.highlighted}
                                   onMouseEnter={behavior.onMouseEnter}
                                   onMouseLeave={behavior.onMouseLeave}
                                   controls={behavior.controls}>
      {props.children}
    </GenericExplorerNode>}
  </ModelButtonBehavior>;
}

function OpenFaceSection({shell}) {
  return <ModelSection model={shell} key={shell.id} controlVisibility>
    <SketchesList face={shell.face}/>
  </ModelSection>;
}

function Section(props) {

  const [expanded, setExpanded] = useState(!props.defaultCollapsed);

  const tweakClose = () => {
    setExpanded(exp => !exp);
  };

  return <>
    <SceneInlineDelineation onClick={tweakClose} style={{cursor: 'pointer'}}>
      <Fa fw icon={'caret-' + (expanded ? 'down' : 'right')}/>
      <span className={ls.label}>{props.label}</span>
    </SceneInlineDelineation>
    {expanded && props.children}
  </>;
}

function SurfacingSceneSection({model}: {model: any}) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => {
      model.refreshSceneEntity();
      forceUpdate(n => n + 1);
    };
    document.addEventListener('patch-cage-constraints-changed', handler);
    return () => document.removeEventListener('patch-cage-constraints-changed', handler);
  }, [model]);

  return <ModelSection model={model} controlVisibility>
    <EntityTreeNode entity={model.scene} />
  </ModelSection>;
}

function PatchCageSection({patchCage}) {
  const [revision, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    document.addEventListener('patch-cage-constraints-changed', handler);
    return () => document.removeEventListener('patch-cage-constraints-changed', handler);
  }, []);

  const sceneEntity = useMemo(
    () => sceneFromPatchCage(patchCage.cage),
    [patchCage.cage, revision]
  );

  return <ModelSection model={patchCage} controlVisibility>
    <EntityTreeNode entity={sceneEntity} />
  </ModelSection>;
}

export function VisibleSwitch({modelId}) {

  const [attrs, patch] = useStreamWithPatcher<ModelAttributes>(ctx => ctx.attributesService.streams.get(modelId));

  const onClick = (e) => {
    patch(attr => {
      attr.hidden = !attr.hidden
    });
    e.stopPropagation();
    return false;
  }

  return <GenericExplorerControl onClick={onClick} title={attrs.hidden ? 'show' : 'hide'} on={attrs.hidden}>
    {attrs.hidden ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
  </GenericExplorerControl>
}
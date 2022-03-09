import React, {useContext, useState} from 'react';
import {MShell} from 'cad/model/mshell';
import {MDatum} from 'cad/model/mdatum';
import {MOpenFaceShell} from "cad/model/mopenFace";
import {useStream, useStreamWithPatcher} from "ui/effects";
import {AppContext} from "cad/dom/components/AppContext";
import {MObject} from "cad/model/mobject";
import {SceneInlineDelineation, SceneInlineSection, SceneInlineTitleBar} from "ui/components/SceneInlineSection";
import {GenericExplorerControl, GenericExplorerNode} from "ui/components/GenericExplorer";
import ls from "cad/craft/ui/ObjectExplorer.less";
import Fa from "ui/components/Fa";
import {AiOutlineEye, AiOutlineEyeInvisible} from "react-icons/ai";
import {ModelAttributes} from "cad/craft/ui/VisibleSwitch";


export function SceneInlineObjectExplorer() {

  const models = useStream(ctx => ctx.craftService.models$);

  if (!models) {
    return null;
  }

  return <SceneInlineSection title='OBJECTS'> {models.map(m => {
    if (m instanceof MOpenFaceShell) {
      return <OpenFaceSection shell={m} />
    } else if (m instanceof MShell) {
      return <ModelSection type='shell' model={m} key={m.id} controlVisibility>
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
      return <ModelSection type='datum' model={m} key={m.id} controlVisibility/>;
    } else {
      return null;
    }
  })}
  </SceneInlineSection>
}

function EdgeSection({edge}) {
  return <ModelSection type='edge' model={edge} key={edge.id}>
    {edge.adjacentFaces.map(f => <FaceSection face={f} key={f.id}/>)}
  </ModelSection>
}

function FaceSection({face}) {
  return <ModelSection type='face' model={face} key={face.id}>

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
      typeLabel={o.sketchPrimitive.constructor.name}
      model={o}
      type={'sketchObject'}
      expandable={false}
    />)}
  </Section>;
}


function ModelSection({model, type, typeLabel, expandable = true, controlVisibility = false, visibilityOf = null, ...props}: {
  model: MObject,
  visibilityOf?: MObject,
  typeLabel?: any,
  type: string,
  children?: any,
  controlVisibility?: boolean,
  expandable?: boolean,
}) {
  const ctx = useContext(AppContext);
  const selection: string[] = useStream(ctx => ctx.streams.selection[type]);

  const select = () => ctx.services.pickControl.pick(model);
  const selected = selection.indexOf(model.id) !== -1;

  let label = <>{typeLabel === undefined ? type:typeLabel} {model.id}</>;
  visibilityOf = visibilityOf||model;
  return <GenericExplorerNode defaultExpanded={false}
                              expandable={expandable}
                              label={label}
                              selected={selected}
                              select={select}
                              controls={
                                <>
                                  {controlVisibility && <VisibleSwitch modelId={visibilityOf.id}/>}
                                </>

                              }>
    {props.children}
  </GenericExplorerNode>
}

function OpenFaceSection({shell}) {
  return <ModelSection type='face' model={shell.face} key={shell.face.id} typeLabel='surface'
                       controlVisibility
                       visibilityOf={shell}>
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

export function VisibleSwitch({modelId}) {

  let [attrs, patch] = useStreamWithPatcher<ModelAttributes>(ctx => ctx.attributesService.streams.get(modelId));

  const onClick = () => {
    patch(attr => {
      attr.hidden = !attr.hidden
    })
  }

  return <GenericExplorerControl onClick={onClick} title={'test'} on={attrs.hidden}>
    {attrs.hidden ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
  </GenericExplorerControl>
}
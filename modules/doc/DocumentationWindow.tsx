import React, {useEffect, useState} from 'react';
import {stream} from "lstream";
import Window from "ui/components/Window";
import {useStream} from "ui/effects";
import marked from 'marked';
import {AiOutlineHome} from "react-icons/ai";
import {RiArrowGoBackLine} from "react-icons/ri";

export const DocumentationTopic$ = stream<DocumentationRequest>();
export const DocumentationUIState$ = stream();

export interface DocumentationRequest {
  documentationLink: string;
  x?: number,
  y?: number
}

export function DocumentationWindow() {
  
  const request: DocumentationRequest = useStream(DocumentationTopic$);

  if (!request) {
    return null;
  }

  const {documentationLink, x, y} = request;

  const stateJson = sessionStorage.getItem('DocumentationWindow');
  let uiState;
  try {
    uiState = JSON.parse(stateJson);
  } catch (ignore) {

  }

  if (!uiState) {
    uiState = {
      width: 750,
      height: 500
    }
  }

  return <Window initWidth={uiState.width} initHeight={uiState.height} initLeft={x} initTop={y}
                 title='Help'
                 enableResize={true}
                 onClose={() => DocumentationTopic$.next(null)}
                 onResize={el => DocumentationUIState$.next(el)}>
    <iframe src={documentationLink} className='documentation-content'/>
  </Window>

}
DocumentationUIState$.throttle(3000).attach(el => {
  // @ts-ignore
  const rect = el.getBoundingClientRect();
  sessionStorage.setItem('DocumentationWindow', JSON.stringify({
    width: rect.width,
    height: rect.height,
  }));
});

import React, {useEffect, useState} from 'react';
import {stream} from "lstream";
import Window from "ui/components/Window";
import {useStream} from "ui/effects";
import marked from 'marked';
import {AiOutlineHome} from "react-icons/ai";
import {RiArrowGoBackLine} from "react-icons/ri";

export const DocumentationTopic$ = stream();
export const DocumentationUIState$ = stream();

export interface DocumentationRequest {
  topic: string;
  x: number,
  y: number
}

export function DocumentationWindow() {
  
  const request: DocumentationRequest = useStream(DocumentationTopic$);
  const [content, setContent] = useState(null);

  useEffect(() => {
    // @ts-ignore
    window.__CAD_APP.DocumentationTopic$ = DocumentationTopic$;
    if (!request) {
      setContent(null);
      return;
    }

    fetch(`/docs/${topic}.md`).then(res => res.text()).then(source => {
      const tokens = marked.lexer(source);
      fixLinks(tokens);
      const html = marked.parser(tokens, {
        baseUrl: 'docs/'
      });
      setContent(html);
    }).catch(e => {
      console.error();
      setContent('No documentation for ' + topic + '.md');
    });

  }, [request?.topic]);

  if (!request) {
    return null;
  }

  const {topic, x, y} = request;

  const stateJson = sessionStorage.getItem('DocumentationWindow');
  let uiState;
  try {
    uiState = JSON.parse(stateJson);
  } catch (ignore) {

  }

  if (!uiState) {
    uiState = {
      width: 350,
      height: 700
    }
  }

  return <Window initWidth={uiState.width} initHeight={uiState.height} initLeft={x} initTop={y}
                 title={topic}
                 enableResize={true}
                 onClose={() => DocumentationTopic$.next(null)}
                 onResize={el => DocumentationUIState$.next(el)}>
    <div className='documentation-toolbar'>
      <button onClick={() => DocumentationTopic$.next({topic: 'index'})}><AiOutlineHome /> </button>
      <button onClick={() => alert("men at work")}><RiArrowGoBackLine /></button>
    </div>
    <p className='documentation-content' dangerouslySetInnerHTML={{__html: content}} />
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


function fixLinks(inputTokens: any[]) {
  const stack = [];
  inputTokens.forEach(t => stack.push(t));
  while (stack.length) {
    const token = stack.pop();
    if (token.type === 'link' && token.href) {
      //removing .md suffix
      token.href = `javascript:__CAD_APP.DocumentationTopic$.next({topic: '${token.href.substring(0, token.href.length-3)}'});`
    }
    if (token.tokens) {
      token.tokens.forEach(t => stack.push(t));
    }
  }



}
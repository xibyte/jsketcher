import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {useStreamWithUpdater} from "ui/effects";
import Window from "ui/components/Window";
import {getAllSketcherActions} from "../actions";
import {memoize} from "lodash/function";
import ls from './TerminalView.less';
import {DIRECTIONS} from "ui/components/Window";
import {SketcherAppContext} from "./SketcherAppContext";

export function TerminalView({visible, output, addToOutput, onClose, variantsSupplier, commandProcessor}) {

  const [history, setHistory] = useState([]);
  const [historyPtr, setHistoryPtr] = useState([]);
  const [input, setInput] = useState('');
  const [autocomplete, setAutocomplete] = useState([]);
  const [shown, setShown] = useState(false);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }

  }, [autocomplete, output.length]);

  useEffect(() => {
    if (inputRef.current && visible) {
      inputRef.current.focus();
    }

  });

  //deferring creation until first time open
  useEffect(() => {
    if (visible && !shown) {
      setShown(true);
    }
  }, [visible]);

  if (!shown) {
    return null;
  }

  const LIMIT = 20;
  const value = historyPtr === history.length ?  input : value;
  return <Window title='Commands' initWidth={700} initHeight={200} initRight={60} initBottom={35}
                 className='sketcher-window'
                 resize={DIRECTIONS.NORTH | DIRECTIONS.SOUTH | DIRECTIONS.WEST | DIRECTIONS.EAST}
                 onClose={onClose}
                 style={{
                   display: visible ? 'flex' : 'none'
                 }}>

    <div className={`${ls.content} panel`} style={{padding: 0}}>
      <div className='scroll' ref={outputRef}>
        {output.map(({kind, text}, key) => <React.Fragment key={key}>
          <div className={ls[kind || 'text']}>{ kind === 'command' ? '> ' : ''} {text}</div>
        </React.Fragment>)}
        {
          autocomplete.length > 0 && <div className={ls.autocompleteArea}>
            {autocomplete.slice(0, LIMIT).map(variant => <span key={variant}>{variant}</span>)}
            {autocomplete.length > LIMIT && <span>... and {autocomplete.length - LIMIT} more</span>}
          </div>
        }
      </div>
      <div className={ls.terminalInput}>
        <input type="text" placeholder="(type a command)"
               ref={inputRef}
               value={input}
               onChange={e => {
                 setHistoryPtr(history.length);
                 setInput(e.target.value)
               }}
               onKeyDown={e => {
                 function consumeEvent() {
                   e.preventDefault();
                   e.stopPropagation();
                 }

                 if (e.keyCode === 9) {
                   const text = e.target.value;
                   let variants = variantsSupplier().filter(v => v.startsWith(text));
                   variants.sort();
                   if (variants.length !== 0) {
                     const shared = sharedStartOfSortedArray(variants);
                     if (shared.length !== text.length) {
                       setInput(shared);
                     }
                   }
                   setAutocomplete(variants);
                   consumeEvent();
                 } else if (e.keyCode === 38) {
                   setHistoryPtr(ptr => Math.max(ptr - 1, 0));
                   consumeEvent();
                 } else if (e.keyCode === 40) {
                   setHistoryPtr(ptr => {
                     if (ptr !== history.length) {
                       Math.min(ptr + 1, history.length - 1)
                     }
                   });
                   consumeEvent();
                 }
               }}

               onKeyUp={e => {
                 if (e.keyCode === 13) {
                   const command = e.target.value;
                   setAutocomplete([]);
                   setInput('');
                   addToOutput(
                     {
                       kind: 'command',
                       text: command
                     }
                   );
                   const commandStr = command.trim();
                   if (commandStr) {
                     commandProcessor(commandStr, addToOutput);
                     if (history.length === 0 || command !== history[history.length - 1]) {
                       setHistory(history => [...history, command]);
                     }
                   }
                   setHistoryPtr(history.length);
                 }
               }}

        />
      </div>
    </div>


  </Window>
}

// ----------------------------------------------------------------------------------------------- //


const getCommands = memoize(allActions => ([
  ...allActions.filter(a => a.command).map(a => a.command),
  'help'
]));

const byCommand = memoize(allActions => {
  const out = {};
  allActions.forEach(a => {
    if (a.command) {
      out[a.command] = a;
    }
  });
  return out;
});

const variantsSupplier = () => getCommands(getAllSketcherActions());

const DEFAULT_COMMAND_HANDLER = (command, println, ctx) => {
  if (command === 'help') {
    println({text: getCommands(getAllSketcherActions()).join(', ')});
  }

  if (ctx.viewer.toolManager.tool.processCommand) {
    ctx.viewer.toolManager.tool.processCommand(command);
    return;
  }

  let action = byCommand(getAllSketcherActions())[command];
  if (action) {
    println({text: action.shortName});
    action.invoke(ctx);
  } else {
    try {
      const output = eval(command);
      println({text: output});
    } catch (e) {
    }
  }
};

function printToSketchTerminal(text, ctx) {
  ctx.ui.$terminalOutput.update(output => ([...output, {
    text
  }]));
}

const commandHandlerStack = [DEFAULT_COMMAND_HANDLER];

export function captureSketcherTerminal(handler) {
  commandHandlerStack.push(handler);
}

export function releaseSketcherTerminal(handler) {
  if (commandHandlerStack.length > 1) {
    commandHandlerStack.pop();
  }
}

export function SketcherTerminal() {
  const [request, setRequest] = useStreamWithUpdater(ctx => ctx.ui.$showTerminalRequest);
  const [output, setOutput] = useStreamWithUpdater(ctx => ctx.ui.$terminalOutput);

  const ctx = useContext(SketcherAppContext);

  const addToOutput = useCallback(line => setOutput(output => {
    output.push(line);
    return output;
  }), [setOutput]);

  useEffect(() => {
    ctx.viewer.referencePoint.visible = !!request;
    ctx.viewer.refresh();
  }, [request]);

  return <TerminalView visible={!!request}
                       onClose={() => setRequest(null)}
                       variantsSupplier={variantsSupplier}
                       output={output}
                       addToOutput={addToOutput}
                       commandProcessor={(command, println) => commandHandlerStack[commandHandlerStack.length - 1](command, println, ctx)}
  />
}

function sharedStartOfSortedArray(array) {
  let a1 = array[0], a2 = array[array.length - 1], L = a1.length, i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}
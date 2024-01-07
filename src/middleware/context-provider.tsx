import React, {
  createContext,
  useReducer,
  FC,
  PropsWithChildren,
  useContext,
} from "react";
import { Action } from "./actions";
import { reducer } from "./state-handler";
import { initialState, State } from "./state";
import { executeCore } from "./core-handler";

const appContext = createContext<[State, React.Dispatch<Action>]>([
  initialState,
  () => {},
]);

export const ContextProvider: FC<PropsWithChildren> = ({ children }) => {
  // @ts-ignore
  const [state, setState] = useReducer(reducer, initialState) as any;

  const dispatch = async (value: Action) => {
    setState(value);
    await executeCore(value);
  };

  return (
    <appContext.Provider value={[state, dispatch]}>
      {children}
    </appContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(appContext);
};

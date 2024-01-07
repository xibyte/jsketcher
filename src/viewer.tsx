import { FC } from "react";
import { ViewerProvider } from "./ViewerProvider";
import { ViewerHeader } from "./components/ViewerHeader";

import { ViewerApp } from "./ViewerApp";
import { ContextProvider } from './middleware/context-provider';
export const Viewer: FC = () => {
  return (
    <ContextProvider>
    <ViewerProvider>
      <ViewerHeader />
      <ViewerApp />
    </ViewerProvider>
    </ContextProvider>
  );
};

export default Viewer;

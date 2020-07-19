import React from "react";
import {LoaderState} from "ui/useDataLoader";
import {Spinner} from "ui/components/Spinner";
import {ErrorMessage} from "ui/components/ErrorMessage";

export function WhenDataReady({loader, children}: {
  loader: LoaderState<any>,
  children: any
}) {

  if (loader.isLoading) {
    return <Spinner />
  } else if (loader.error) {
    return <ErrorMessage error={loader.error} />
  } else if (loader.data) {
    return children(loader.data);
  } else {
    return null;
  }

}
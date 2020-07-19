import {useEffect, useState} from "react";
import {checkHttpResponseStatus} from "network/checkHttpResponseStatus";


export interface LoaderState<T> {

  data: T;

  error: null;

  isLoading: boolean;

}

export function useDataLoader<T>(url: string, loader: () => Promise<T>) {

  const [loaderState, setLoaderState] = useState<LoaderState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });


  useEffect(() => {

    setLoaderState({
      data: null,
      error: null,
      isLoading: true,
    });

    loader()
      .then(data => setLoaderState({
        data,
        error: null,
        isLoading: false,
      }))
      .catch(error => setLoaderState({
        data: null,
        error,
        isLoading: false,
      }));

  }, [url]);

  return loaderState;
}

export function useUrlDataLoader<T>(url: string) {

  return useDataLoader(url, () => fetch(url).then(checkHttpResponseStatus));
}
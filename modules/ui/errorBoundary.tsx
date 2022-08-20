import React from 'react';
import context from 'cad/context';
import {Stream} from "lstream";
import {useStream} from "ui/effects";

type ErrorBoundaryProps = {
  message: any;
  children: any;
};

export function HealingErrorBoundary({resetOn, ...props}: ErrorBoundaryProps & {
  resetOn: (ctx) => Stream<any>,
}) {

  const key = useStream(ctx => resetOn(ctx).scan(0, (acc, curr) => acc + curr));

  return <ErrorBoundary key={key} {...props} />;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, {
  hasError: boolean
}> {

  state = {
    hasError: false,
  };

  componentDidCatch(error:Error, errorInfo:React.ErrorInfo) {
    console.error(error);
    this.setState({hasError: true});
  }

  render() {
    if (this.state.hasError) {
      return this.props.message || null;
    }
    return this.props.children;
  }
}


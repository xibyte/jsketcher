import React from "react";

export function SafeLength(props: { text: string, limit? : number }): any {

  const limit = props.limit || 40;
  const mid = limit / 2;
  const text = props.text;
  if (text.length > limit) {
    return <span title={text}>{text.substring(0, mid)}...{text.substring(text.length - mid, text.length)}</span>;
  } else {
    return text;
  }
}
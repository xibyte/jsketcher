import React from "react";
import {GrStatusWarning} from "react-icons/gr";

export function ErrorMessage({error}: {
  error: Error|string
}) {

  let msg;
  if (typeof error === 'string') {
    msg = error;
  } else {
    msg = error.message;
  }

  return <div style={{
    display: 'flex',
    alignItems: 'center',
    color: 'salmon'
  }}>
    <GrStatusWarning size={32} style={{
      paddingRight: '10px'
    }}/>
    <div>{msg}</div>
  </div>

}
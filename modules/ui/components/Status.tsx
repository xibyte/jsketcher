import * as React from "react";
import {BsCheckCircle, BsQuestionCircle} from "react-icons/bs";
import {FaRegTimesCircle} from "react-icons/fa";

export function Status({success}: {
  success?: boolean
}) {

  if (success === true) {
    return <span><BsCheckCircle style={{
      color: 'green'
    }}/> success</span>
  } else if (success === false) {
    return <span><FaRegTimesCircle style={{
      color: 'red'
    }}/> fail</span>
  } else {
    return <span><BsQuestionCircle style={{
      color: 'orange'
    }}/> unknown</span>
  }

}
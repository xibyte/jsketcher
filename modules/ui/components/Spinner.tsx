import React from "react";
import {FiLoader} from "react-icons/fi";

export function Spinner({size = 100}) {

  return <FiLoader className='icon-spin' size={size + 'px'} />;
}
import React, {useState, ReactNode} from "react";
import cx from 'classnames';
import {GoPrimitiveDot, GoTriangleDown, GoTriangleRight} from "react-icons/go";

export function Tree({children, icon, label, initCollapsed = false, className, onClick, ...props} : {
  initCollapsed?: boolean
  children?: ReactNode,
  icon?: ReactNode,
  label?: ReactNode,
  className?: string
  onClick?: (e: any) => void,
  props?: JSX.IntrinsicAttributes
}) {

  const headless = !label;
  const [collapsed, setCollapsed] = useState(initCollapsed);

  return <div className={cx('tree', className)}>

    {!headless && <div className='tree-caption'>
      {children ?
        (<span onClick={() => setCollapsed(collapsed => !collapsed)}>{collapsed ? <GoTriangleRight/> :
          <GoTriangleDown/>}</span>) :
        <span className='tree-placeholder'><GoPrimitiveDot /></span>
      }
      <span className='tree-icon'>{icon}</span>
      <span onClick={onClick} className='tree-label text-button' {...props}>{label}</span>
    </div>}

    {children && <div className='tree-content'>{children}</div>}

  </div>;

}

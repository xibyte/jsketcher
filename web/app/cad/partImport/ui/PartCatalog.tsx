import React, {ReactNode} from "react";
import {CatalogCategory, CatalogPart} from "../partImportPlugin";
import {Tree} from "ui/components/Tree";
import {TiFolder, TiPuzzleOutline} from "react-icons/ti";

export function PartCatalog({root, initCollapsed, name, icon} : {
  root: CatalogCategory,
  initCollapsed: boolean,
  name: string,
  icon: ReactNode
}) {

  return <Tree initCollapsed={initCollapsed} label={name} icon={icon}>

    {root.entries.map(entry => {
      if (entry.type === 'category') {

        const category = entry as CatalogCategory;

        return <PartCatalog root={category} initCollapsed={true} name={category.name} icon={<TiFolder />}/>

      } else if (entry.type === 'part') {

        const part = entry as CatalogPart;

        return <Tree label={part.name} icon={<TiPuzzleOutline />}/>
      }
    })}

  </Tree>;

}

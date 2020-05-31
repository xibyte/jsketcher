import React, {ReactNode} from "react";
import {CatalogCategory, CatalogPart} from "../partImportPlugin";
import {Tree} from "ui/components/Tree";
import {FiBox} from "react-icons/fi";
import {GrCubes} from "react-icons/gr";
import theme from "ui/styles/theme";

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

        return <PartCatalog root={category} initCollapsed={true} name={category.name} icon={<GrCubes color={theme.onColorHighlightVariantYellow}/>}/>

      } else if (entry.type === 'part') {

        const part = entry as CatalogPart;

        return <Tree label={part.name} icon={<FiBox color={theme.onColorHighlightVariantGreen}/>}/>
      }
    })}

  </Tree>;

}

import React, {ReactNode} from "react";
import {CatalogCategory, CatalogPart} from "../remotePartsBundle";
import {Tree} from "ui/components/Tree";
import {FiBox} from "react-icons/fi";
import {GrCubes} from "react-icons/gr";
import theme from "ui/styles/theme";

export function PartCatalog({catalogId, root, initCollapsed, name, icon, onChoose} : {
  catalogId: string,
  root: CatalogCategory,
  initCollapsed: boolean,
  name: string,
  icon: ReactNode,
  onChoose: (part: string) => void
}) {

  return <Tree initCollapsed={initCollapsed} label={name} icon={icon}>

    {root.entries.map(entry => {
      if (entry.type === 'category') {

        const category = entry as CatalogCategory;

        return <PartCatalog key={entry.name} root={category} initCollapsed={true}
                            name={category.name} catalogId={catalogId} onChoose={onChoose}
                            icon={<GrCubes color={theme.onColorHighlightVariantYellow}/>}/>

      } else if (entry.type === 'part') {

        const part = entry as CatalogPart;

        const partRef = catalogId + '/' + part.id;
        return <Tree key={entry.name}
                     label={part.name}
                     onClick={(e) => onChoose(partRef)}
                     data-part-ref={partRef}
                     icon={<FiBox color={theme.onColorHighlightVariantGreen}/>}/>
      }
    })}

  </Tree>;

}

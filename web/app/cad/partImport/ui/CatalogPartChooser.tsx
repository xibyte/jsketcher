import React, {useContext, useState} from 'react';
import {useStreamWithUpdater} from "ui/effects";
import {PartCatalog} from "./PartCatalog";
import {AppContext} from "../../dom/components/AppContext";
import {Dialog} from "ui/components/Dialog";
import {useDataLoader} from "ui/useDataLoader";
import {WhenDataReady} from "ui/components/WhenDataReady";
import {GrCubes} from "react-icons/gr";
import theme from "ui/styles/theme";

export function CatalogPartChooser() {

  const [req, setReq] = useStreamWithUpdater(ctx => ctx.remotePartsService.choosePartRequest$);
  const ctx = useContext(AppContext);
  const loader = useDataLoader('parts', () => ctx.remotePartsService.loadDefinedCatalogs());

  if (!req) {
    return null;
  }

  const close = () => {
    setReq(null);
    req.onDone(null);
  };

  const partChosen = part => {
    setReq(null);
    req.onDone(part);
  };

  return <Dialog initWidth={800} initHeight={600} centerScreen={req.centerScreen} initLeft={req.x} initTop={req.y}
                 title='PART CATALOG'
                 enableResize={true}
                 onClose={close}
                 cancelText='Close'
                 className='part-catalog-chooser'

  >
    <WhenDataReady loader={loader}>
      {catalogs => catalogs.map(([entry, partCatalog]) => {
        const Icon = partCatalog.icon || GrCubes;
        return <PartCatalog key={partCatalog.id}
                            root={entry}
                            initCollapsed={false}
                            catalogId={partCatalog.id}
                            name={partCatalog.name + partCatalog.description}
                            icon={<Icon color={theme.onColorHighlightVariantPink}/>}
                            onChoose={partChosen}
        />
      })}
    </WhenDataReady>

  </Dialog>


}
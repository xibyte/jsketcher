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

  const [req, setReq] = useStreamWithUpdater(ctx => ctx.partImportService.choosePartRequest$);
  const ctx = useContext(AppContext);
  const [chosen, setChosen] = useState(null);

  const loader = useDataLoader('parts', () => ctx.partImportService.loadDefinedCatalogs());

  const close = () => {
    setReq(null);
    req.onDone(null);
  };

  if (!req) {
    return null;
  }

  return <Dialog initWidth={800} initHeight={600} centerScreen={req.centerScreen} initLeft={req.x} initTop={req.y}
                 title='PART CATALOG'
                 enableResize={true}
                 onClose={close}
                 cancelText='Close'


  >
    <WhenDataReady loader={loader}>
      {catalogs => catalogs.map(([partCatalog, descriptor]) => {
        const Icon = descriptor.icon || GrCubes;
        return <PartCatalog root={partCatalog} initCollapsed={false} name={descriptor.name + descriptor.description} icon={<Icon color={theme.onColorHighlightVariantPink}/>} />
      })}
    </WhenDataReady>

  </Dialog>


}
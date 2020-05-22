import {FaSitemap} from "react-icons/fa";
import {PartsCatalog} from "./partImportPlugin";
import {GitHubRepoRepository} from "../repository/GitHubRepoRepository";

export const WEB_CAD_ORG_COMMONS: PartsCatalog = Object.freeze({

  id: 'web-cad.org',
  name: 'Commons Parts',
  description: 'Public parts repository by web-cad.org',
  icon: FaSitemap,
  repo: new GitHubRepoRepository('xibyte/web-cad', 'master'),
  metadataPath: 'commons.catalog.json',
  partsPath: 'parts'

});


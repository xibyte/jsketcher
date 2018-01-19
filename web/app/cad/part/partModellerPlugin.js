import * as UIConfigPlugin from './uiConfigPlugin';
import * as PartOperationsPlugin from './partOperationsPlugin';
import {activatePlugins} from "../init/startApplication";

const PART_MODELLER_PLUGINS = [
  UIConfigPlugin,
  PartOperationsPlugin
];

export function activate(context) {
  activatePlugins(PART_MODELLER_PLUGINS, context);
}
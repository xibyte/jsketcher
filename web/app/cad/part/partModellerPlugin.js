import * as UIConfigPlugin from './uiConfigPlugin';
import * as PartOperationsPlugin from './partOperationsPlugin';
import * as DebugPlugin from '../debugPlugin';
import {activatePlugins} from "../init/startApplication";

const PART_MODELLER_PLUGINS = [
  UIConfigPlugin,
  DebugPlugin,
  PartOperationsPlugin
];

export function activate(context) {
  activatePlugins(PART_MODELLER_PLUGINS, context);
}
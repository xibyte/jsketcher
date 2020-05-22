import * as UIConfigPlugin from './uiConfigPlugin';
import * as PartOperationsPlugin from './partOperationsPlugin';
import * as PartImportPlugin from '../partImport/partImportPlugin';
import * as DebugPlugin from '../debugPlugin';
import * as ExpressionsPlugin from '../expressions/expressionsPlugin';

export default [
  UIConfigPlugin,
  DebugPlugin,
  ExpressionsPlugin,
  PartOperationsPlugin,
  PartImportPlugin
];

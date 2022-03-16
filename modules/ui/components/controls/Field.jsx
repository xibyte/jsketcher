import React, {useMemo} from 'react';

import ls from './Field.less'
import cx from 'classnames';

export const FieldId = React.createContext(-1);

let ID_GENERATOR = 0;

export default function Field({active, name, ...props}) {

  const fieldId = useMemo(() => 'Field_' + (ID_GENERATOR++), []);

  return <FieldId.Provider value={fieldId}>
    <div className={cx(ls.root, active&&ls.active)} data-field-name={name} {...props} />
  </FieldId.Provider>;
}

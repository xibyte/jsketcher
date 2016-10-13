import {sprintf} from 'sprintf'

export function Bind(dom, data, policy) {
  if (!policy) policy = DEFAULT_POLICY;
  const props = Object.getOwnPropertyNames(data);
  for (let prop of props) {
    const node = $(dom).find('[data-bind="'+prop+'"]');
    if (node.length == 0) continue;
    let value = data[prop];
    if (!policy.hideEmptyValue || value || value === 0) {
      var format = node.attr('bind-format');
      if (format) {
        value = sprintf(format, value);
      }
      node.text(value);
      node.show();
    } else {
      node.text('');
      node.hide();
    }
  }
}

const DEFAULT_POLICY = {
  hideEmptyValue: true
};
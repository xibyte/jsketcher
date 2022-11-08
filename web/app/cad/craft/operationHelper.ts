import {Operation} from "cad/craft/operationBundle";
import {resolveIcon} from "cad/craft/ui/iconResolver";

export function roundValueForPresentation(value) {
  return value.toPrecision ? value.toPrecision(4).replace(/\.0$/, '') : value;
}

export function operationIconToActionIcon(icon, appearance) {
  //console.log(icon);
  if (typeof icon === 'string') {
    if (icon.startsWith("<svg")){
      appearance.icon32 = "data:image/svg+xml;base64,"+btoa(icon);
      appearance.icon96 = "data:image/svg+xml;base64,"+btoa(icon);
    }else{
      appearance.icon32 = icon + '32.png';
      appearance.icon96 = icon + '96.png';
    }
  } else {
    appearance.icon = resolveIcon(icon);
  }
  console.log(icon, appearance)
}

export function resolveAppearance<R>(op: Operation<R>, params: R) {
  let appearance = op.appearance;
  if (!op.dynamicLabel && !op.dynamicIcon) {
    return appearance;
  }
  appearance = {...appearance};

  if (op.dynamicLabel) {
    const label = op.dynamicLabel(params);
    if (label) {
      appearance.label = label;
    }
  }

  if (op.dynamicIcon) {
    const icon = op.dynamicIcon(params);
    if (icon) {
      operationIconToActionIcon(icon, appearance);
    }
  }

  return appearance;
}


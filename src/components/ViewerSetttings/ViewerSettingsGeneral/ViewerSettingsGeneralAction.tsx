import { useViewerContext } from "../../../ViewerProvider";
import { MenuItem, Select, Slider, Switch } from "@mui/material";
import { FC } from "react";
import { GeneralSettingsType } from "./generalSettings";

export type ViewerSettingsGeneralActionProps = {
  action: GeneralSettingsType;
};

export const ViewerSettingsGeneralAction: FC<
  ViewerSettingsGeneralActionProps
> = ({ action }) => {
  const { generalSettingsState, changeGeneralSettings } = useViewerContext();

  const currentValue = generalSettingsState && generalSettingsState[action.id];

  const handleChange = (_: any, value: any) => {
    const newSettings = { ...generalSettingsState };
    newSettings[action.id] = value;
    changeGeneralSettings(newSettings);
  };

  switch (action.type) {
    case "boolean": {
      return <Switch onChange={handleChange} checked={currentValue} />;
    }
    case "number": {
      return (
        <Slider
          sx={{ width: "40%" }}
          onChangeCommitted={handleChange}
          value={currentValue}
        />
      );
    }
    case "select": {
      return (
        <Select
          sx={{ width: "40%" }}
          onChange={(ev) => handleChange(undefined, ev.target.value)}
          value={currentValue || action.initialValue}
        >
          {action.options &&
            Object.keys(action.options).map((option) => {
              const name = action.options?.[option];
              const selected = currentValue === option;
              return (
                <MenuItem key={option} value={option} selected={selected}>
                  {name}
                </MenuItem>
              );
            })}
        </Select>
      );
    }
    default: {
      return null;
    }
  }
};

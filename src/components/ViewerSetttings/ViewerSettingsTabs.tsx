import { Box, MenuItem, MenuList, Typography } from "@mui/material";
import { FC } from "react";
import { tabs, useViewerSettingsContext } from "./ViewerSettings";
import { PaletteSettings } from '../../utils/palette';

export const ViewerSettingsTabs: FC = () => {
  const { currentTab, setCurrentTab } = useViewerSettingsContext();
  return (
    <MenuList
      disablePadding
      sx={{ paddingX: 3, display: "flex", gap: 3, flexDirection: "row" }}
    >
      {tabs.map(({ title, id }) => {
        const isSelected = id === currentTab;
        return (
          <MenuItem
            key={id}
            sx={{ padding: 0, position: "relative" }}
            onClick={() => {
              setCurrentTab(id);
            }}
          >
            <Typography
              color={PaletteSettings.main.icon}
              variant="subtitle2"
            >
              {title}
            </Typography>
            {isSelected && (
              <Box
                position="absolute"
                bottom={-17}
                width="100%"
                height="0px"
                boxSizing="border-box"
                borderBottom="2px solid"
                borderColor={PaletteSettings.main.primary}
                zIndex={300}
              />
            )}
          </MenuItem>
        );
      })}
    </MenuList>
  );
};

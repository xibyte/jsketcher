import { Box } from "@mui/material";
import { FC } from "react";
import { tabs, useViewerSettingsContext } from "./ViewerSettings";
import { PaletteSettings } from '../../utils/palette';

export const ViewerSettingsContent: FC = () => {
  const { currentTab, currentStep } = useViewerSettingsContext();
  const currentTabContent = tabs.find((tab) => currentTab === tab.id)?.content;

  return (
    <Box
      sx={{
        paddingRight: "4px",
        overflowY: "auto",
        "&::-webkit-scrollbar": {
          width: "10px",
          backgroundColor: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          borderRadius: "4px",
          width: "6px",
          backgroundColor: PaletteSettings.background.separator,
        },
      }}
      flexGrow={1}
    >
      <Box display={currentStep ? "block" : "none"}>{currentStep?.content}</Box>
      <Box display={currentStep ? "none" : "block"}>{currentTabContent}</Box>
    </Box>
  );
};

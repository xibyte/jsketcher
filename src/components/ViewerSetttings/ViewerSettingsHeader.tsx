import { IconButton, Stack, Typography } from "@mui/material";
import { FC } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { useViewerSettingsContext } from "./ViewerSettings";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { PaletteSettings } from '../../utils/palette';

export const ViewerSettingsHeader: FC = () => {
  const { setIsOpen, currentStep, stepBack } = useViewerSettingsContext();

  return (
    <Stack
      paddingX={3}
      direction="row"
      justifyContent="space-between"
      alignItems="center"
    >
      <Stack direction="row" alignItems="center" gap={3}>
        {Boolean(currentStep) && (
          <IconButton onClick={stepBack} sx={{ color: PaletteSettings.main.icon }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h5" color={PaletteSettings.main.primary}>
          {currentStep ? currentStep.title : "Settings"}
        </Typography>
      </Stack>
      <IconButton
        onClick={() => setIsOpen(false)}
        sx={{ color: `${PaletteSettings.main.icon}` }}
      >
        <CloseIcon />
      </IconButton>
    </Stack>
  );
};

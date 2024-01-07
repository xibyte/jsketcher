import MoreVert from "@mui/icons-material/MoreVert";
import { IconButton, Stack } from "@mui/material";
import { FC, useState } from "react";
import { ViewerSettings } from "./ViewerSetttings";
import { PaletteSettings } from '../utils/palette';

export const ViewerHeader: FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  return (
    <>
      <Stack
        direction="row"
        gap="12px"
        component="div"
        justifyContent="center"
        alignItems="center"
        sx={{
          position: "fixed",
          top: 8,
          left: 32,
          height: "40px",
          backgroundColor: "transparent",
          zIndex: 10,
        }}
      >
      </Stack>
      <Stack
        direction="row"
        gap={3}
        component="div"
        justifyContent="center"
        alignItems="center"
        sx={{
          position: "fixed",
          top: 12,
          right: 32,
          height: "40px",
          backgroundColor: "transparent",
          zIndex: 10,
        }}
      >
        {/* <Button startIcon={<TuneIcon />} variant="contained">
          Tools
        </Button> */}
        <IconButton
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          sx={{ color: PaletteSettings.background.white }}
        >
          <MoreVert />
        </IconButton>
      </Stack>
      <ViewerSettings isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />
    </>
  );
};

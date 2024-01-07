import { Box, Divider, Stack, Typography } from "@mui/material";
import { FC } from "react";
import { ViewerSettingsGeneralAction } from "./ViewerSettingsGeneralAction";
import generalSettings from "./generalSettings";
import { PaletteSettings } from '../../../utils/palette';

export const ViewerSettingsGeneral: FC = () => {
  return (
    <Box paddingX={3}>
      <Stack gap={3} divider={<Divider />}>
        {generalSettings.map((settingGroup) => {
          return (
            <Box key={settingGroup.id}>
              <Typography variant="overline" color={PaletteSettings.text.label}>
                {settingGroup.title}
              </Typography>
              <Stack gap={2}>
                {settingGroup.settings.map((setting) => {
                  return (
                    <Stack
                      alignItems="center"
                      direction="row"
                      justifyContent="space-between"
                      key={setting.id}
                    >
                      <Stack direction="row" gap={2} alignItems="center">
                        <Box>
                          <setting.IconComponent
                            sx={{ color: PaletteSettings.main.info }}
                          />
                        </Box>
                        <Typography variant="body2" color={PaletteSettings.text.primary}>
                          {setting.title}
                        </Typography>
                      </Stack>
                      <ViewerSettingsGeneralAction action={setting} />
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

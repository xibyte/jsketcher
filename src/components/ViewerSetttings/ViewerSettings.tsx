import { Box, Divider, Stack } from "@mui/material";
import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import { ViewerSettingsContent } from "./ViewerSettingsContent";
import { ViewerSettingsGeneral } from "./ViewerSettingsGeneral";
import { ViewerSettingsHeader } from "./ViewerSettingsHeader";
import { ViewerSettingsTabs } from "./ViewerSettingsTabs";

export type ViewerSettingsTabType = "general" | "tools" | "embed";

type TabsType = {
  content: ReactNode;
  id: ViewerSettingsTabType;
  title: string;
};

export const tabs: TabsType[] = [
  { title: "General", id: "general", content: <ViewerSettingsGeneral /> }
];

export type ViewerStepperType = { title: string; content: ReactNode };

export type ViewerSettingsContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentTab: ViewerSettingsTabType;
  setCurrentTab: (currentTab: ViewerSettingsTabType) => void;
  currentStep: ViewerStepperType;
  stepBack: () => void;
  addStep: (stepper: ViewerStepperType) => void;
};

export const ViewerSettingsContext =
  createContext<ViewerSettingsContextType | null>(null);

export const ViewerSettings: FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}> = ({ isOpen, setIsOpen }) => {
  const [currentTab, setCurrentTab] =
    useState<ViewerSettingsTabType>("general");

  const [stepper, setStepper] = useState<ViewerStepperType[]>([]);

  const currentStep = stepper[stepper.length - 1];

  const value = useMemo(() => {
    const stepBack = () => {
      const newStepper = [...stepper];
      newStepper.pop();
      setStepper(newStepper);
    };

    const addStep = (newStep: ViewerStepperType) => {
      setStepper([...stepper, newStep]);
    };
    return {
      isOpen,
      setIsOpen,
      currentTab,
      setCurrentTab,
      currentStep,
      stepBack,
      addStep,
    };
  }, [
    currentTab,
    isOpen,
    setIsOpen,
    currentStep,
    stepper,
    setCurrentTab,
    setStepper,
  ]);

  return (
    <ViewerSettingsContext.Provider value={value}>
      <Box
        position="fixed"
        top={0}
        bottom={0}
        sx={{
          top: 0,
          bottom: 0,
          right: isOpen ? 0 : "-100%",
          transition: "all 0.7s ease",
          backgroundColor: "rgba(0,0,0,0.75)",
          width: "486px",
          zIndex: 100,
          paddingY: "12px",
          backdropFilter: "blur(28px)",
          boxShadow: "0px 8px 25px 0px rgba(0, 0, 0, 0.20)",
        }}
      >
        <Stack gap={2} divider={<Divider />} height="100%">
          <ViewerSettingsHeader />
          {!currentStep && <ViewerSettingsTabs />}
          <ViewerSettingsContent />
        </Stack>
      </Box>
    </ViewerSettingsContext.Provider>
  );
};

export const useViewerSettingsContext = () => {
  const context = useContext(ViewerSettingsContext);
  if (!context) {
    throw new Error(
      "useViewerSettingsContext needs to be used in a child of ViewerSettings"
    );
  }

  return context;
};

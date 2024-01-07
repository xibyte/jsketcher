import {
    FC,
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import {useLocalStorage} from "./hooks/useLocalStorage";
import {TOOEEN_APP_GENERAL_SETTINGS} from "./utils/types";
import {useAppContext} from "./middleware/context-provider";

type GeneralSettingsStateType = Record<string, any>;

export type ViewerContextType = {
    generalSettingsState?: GeneralSettingsStateType;
    changeGeneralSettings: (generalSettings: GeneralSettingsStateType) => void;
};

export const ViewerContext = createContext<ViewerContextType | null>(null);

export const ViewerProvider: FC<PropsWithChildren> = ({children}) => {

    const [_appContextState, dispatchAppContextState] = useAppContext() as any;

    const {value: initialGeneralSettings, setValue: setGeneralSettingsStorage} =
        useLocalStorage<GeneralSettingsStateType>(TOOEEN_APP_GENERAL_SETTINGS);
    const [generalSettingsState, setGeneralSettingsState] = useState<GeneralSettingsStateType | undefined>(initialGeneralSettings);

    const changeGeneralSettings = (generalSettings: GeneralSettingsStateType) => {
        setGeneralSettingsState(generalSettings);
        setGeneralSettingsStorage(generalSettings);
        dispatchAppContextState({
            type: "UPDATE_SETTINGS",
            payload: {settings: generalSettings},
        });
    };

    useEffect(() => {
        dispatchAppContextState({
            type: "UPDATE_SETTINGS",
            payload: {settings: initialGeneralSettings},
        });
    }, []);

    return (
        <ViewerContext.Provider
            value={{
                generalSettingsState,
                changeGeneralSettings,
            }}
        >
            {children}
        </ViewerContext.Provider>
    );
};

export const useViewerContext = () => {
    const viewerContext = useContext(ViewerContext);
    if (!viewerContext) {
        throw new Error("ViewerContext must be used under ViewerProvider");
    }
    return viewerContext;
};

import { Box } from "@mui/material";
import { FC, useEffect, useRef } from "react";
import { useAppContext } from "./middleware/context-provider";
//@ts-ignore
import appStyles from "./viewer-styles.module.css";

export const ViewerApp: FC = () => {
  const [_state, dispatch] = useAppContext() as any;
  const containerRef = useRef(null);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const container = containerRef.current;
    if (container) {
      dispatch({ type: "START", payload: { container } });
    }
  }, []);

  return (
    <Box
      style={appStyles}
      component="div"
      sx={{
        position: "absolute !important",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      }}
      ref={containerRef}
    />
  );
};

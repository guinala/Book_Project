import { Toaster } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import "./AppToaster.scss";

export default function AppToaster() {
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 767px)");

  return (
    <Toaster
      position={isMobile ? "bottom-center" : "bottom-right"}
      theme={theme}
      duration={5000}
      visibleToasts={3}
      gap={8}
      offset={isMobile ? "calc(env(safe-area-inset-bottom, 0) + 16px)" : 16}
      closeButton={false}
      richColors={false}
    />
  );
}

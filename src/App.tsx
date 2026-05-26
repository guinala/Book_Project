import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import Navbar from "@/components/layout/Navbar";
import NavbarMini from "@/components/layout/NavbarMini";
import { AuthProvider } from "@/context/auth/AuthContext";
import { ThemeProvider } from "@/context/theme/ThemeContext";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import { usePreferences } from "@/context/preferences/usePreferences";
import Footer from "@/components/layout/Footer";
import "./App.scss"
import { ShelfProvider } from "./context/shelf/ShelfContext";
import i18n from "./plugins/i18n/i18n";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { NotificationsProvider } from "./context/notifications/NotificationsContext";
import AppToaster from "./components/common/Toaster/AppToaster";
import { ExploreCacheProvider } from "./context/explore-cache/ExploreCacheContext";

const SCROLL_THRESHOLD = 80;

function AppShell() {
  const { miniNavEnabled } = usePreferences();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!miniNavEnabled) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [miniNavEnabled]);

  return (
    <>
      <Navbar hidden={scrolled} />
      <NavbarMini visible={scrolled} />
      <main>
        <Outlet />
      </main>
      <Footer />
      <AppToaster />
    </>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    const handler = (lng: string) => { document.documentElement.lang = lng; };
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PreferencesProvider>
          <AuthProvider>
            <ExploreCacheProvider>
              <ShelfProvider>
                <NotificationsProvider>
                  <AppShell />
                </NotificationsProvider>
              </ShelfProvider>
            </ExploreCacheProvider>
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

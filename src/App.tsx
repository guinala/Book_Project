import { useState, useEffect } from "react";
import { Outlet, ScrollRestoration } from "react-router";
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
import { queryClient } from "./services/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const SCROLL_THRESHOLD = 80;

function AppShell() {
  const { miniNavEnabled } = usePreferences();
  const [scrolled, setScrolled] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const reloadCurrent = () => {
    setReloadCount((c) => c + 1);
    window.scrollTo({ top: 0});
  };

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
      <Navbar hidden={scrolled} onActiveClick={reloadCurrent}/>
      <NavbarMini visible={scrolled} onActiveClick={reloadCurrent}/>
      <main>
        <Outlet key={reloadCount}/>
      </main>
      <Footer />
      <AppToaster />
      <ScrollRestoration />
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
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PreferencesProvider>
            <AuthProvider>
              <ShelfProvider>
                <NotificationsProvider>
                  <AppShell />
                </NotificationsProvider>
              </ShelfProvider>
            </AuthProvider>
          </PreferencesProvider>
        </ThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

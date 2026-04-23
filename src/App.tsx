import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import Navbar from "@/components/Navbar/Navbar";
import NavbarMini from "@/components/NavbarMini/NavbarMini";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import "./App.scss"
import { ShelfProvider } from "./context/ShelfContext";

const SCROLL_THRESHOLD = 80;

export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ShelfProvider>
          <Navbar hidden={scrolled} />
          <NavbarMini visible={scrolled} />
          <main>
            <Outlet />
          </main>
        </ShelfProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

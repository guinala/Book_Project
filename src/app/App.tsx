import { Outlet } from "react-router";
import Navbar from "../components/Navbar/Navbar";
import { AuthProvider } from "../context/AuthContext";
import "./App.scss"

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </AuthProvider>
  );
}
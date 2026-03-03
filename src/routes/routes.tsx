import App from '../App'
import LandingPage from '../LandingPage'
import AuthPage from '../AuthPage'

export const ROUTES = [
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "auth", element: <AuthPage /> },
    ],
  },
];

export const NAV_LINKS = [
  { path: "/my-library", label: "Mi Biblioteca" },
  { path: "/explore",    label: "Explorar" },
  { path: "/community",  label: "Comunidad" },
];

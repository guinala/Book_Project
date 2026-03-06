import App from '../app/App'
import LandingPage from '../pages/LandingPage/LandingPage'
import AuthPage from '../pages/AuthPage/AuthPage'
import StyleGuide from '../pages/StyleGuide/Styleguide';

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

import App from '../App'
import LandingPage from '../LandingPage'
import AuthPage from '../AuthPage'
import StyleGuide from '../pages/styleguide/Styleguide';

export const ROUTES = [
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <StyleGuide /> },
      { path: "auth", element: <AuthPage /> },
    ],
  },
];

export const NAV_LINKS = [
  { path: "/my-library", label: "Mi Biblioteca" },
  { path: "/explore",    label: "Explorar" },
  { path: "/community",  label: "Comunidad" },
];

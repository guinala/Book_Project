import "./plugins/i18n/i18n.ts";  
import { createRoot } from 'react-dom/client'
import "./styles/index.scss"
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ROUTES } from './routes/routes.tsx'


const router = createBrowserRouter(ROUTES)

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)

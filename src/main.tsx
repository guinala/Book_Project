import { createRoot } from 'react-dom/client'
import "./styles/css/index.css"
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ROUTES } from './routes/routes.tsx'


const router = createBrowserRouter(ROUTES)

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)

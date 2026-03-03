import { Outlet } from 'react-router'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  )
}

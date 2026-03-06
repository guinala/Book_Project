import { Navigate } from "react-router";
import { useAuth } from "../services/Auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * Solo para usuarios autenticados
 */
export default function AuthRoute({
  children,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, isGuest, loading } = useAuth();

  if (loading) {
    return <p style={{ textAlign: "center", padding: "60px" }}>Cargando...</p>;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
import { Navigate } from "react-router";
import { useAuth } from "../services/Auth";
import { useTranslation } from "react-i18next";

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
  const { isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <p style={{ textAlign: "center", padding: "60px" }}>{t("auth.loading")}</p>;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
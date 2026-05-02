import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import AuthForm from "@/components/auth/AuthForm";

function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/explore", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  return <AuthForm />;
}

export default AuthPage;
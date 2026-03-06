import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../services/Auth";
import AuthForm from "../../components/Auth/AuthForm";

function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/my-library", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  return <AuthForm />;
}

export default AuthPage;
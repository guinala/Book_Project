import { useNavigate } from "react-router";
import { useAuth } from "../../services/Auth";
import { useEffect } from "react";
import "./LandingPage.scss";

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/my-library", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = () => {
    navigate("/auth");
  };

  const handleGuest = () => {
    navigate("/explore");
  };

  if (loading) {
    return (
      <div className="landing">
        <p className="landing__loading">Comprobando sesión...</p>
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="landing__content">
        <span className="landing__icon">📖</span>
        <h1 className="landing__title">Bienvenido a Trama</h1>
        <p className="landing__subtitle">
          Tu compañero de lectura. Descubre, organiza y comparte los libros que
          dan forma a tu mundo.
        </p>

        <div className="landing__actions">
          <button
            type="button"
            className="landing__btn-login"
            onClick={handleLogin}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className="landing__btn-guest"
            onClick={handleGuest}
          >
            Entrar como Invitado
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
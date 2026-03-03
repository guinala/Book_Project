import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../../services/firebase_init";
import "../../styles/css/components/auth/AuthForm.css";

type Screen = "loading" | "login" | "register" | "user";

function getErrorMessage(errorCode: string): string {
  const errors: Record<string, string> = {
    "auth/email-already-in-use":   "Este email ya está registrado",
    "auth/invalid-email":          "Email inválido",
    "auth/operation-not-allowed":  "Operación no permitida",
    "auth/weak-password":          "La contraseña debe tener al menos 6 caracteres",
    "auth/user-disabled":          "Usuario deshabilitado",
    "auth/user-not-found":         "Usuario no encontrado",
    "auth/wrong-password":         "Contraseña incorrecta",
    "auth/invalid-credential":     "Credenciales inválidas",
    "auth/popup-closed-by-user":   "Popup cerrado por el usuario",
    "auth/cancelled-popup-request":"Solicitud cancelada",
  };
  return errors[errorCode] ?? `Error: ${errorCode}`;
}

export default function Auth() {
  const [screen, setScreen] = useState<Screen>("loading");

  const [user, setUser] = useState<User | null>(null);

  const [loginEmail,    setLoginEmail]    = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError,    setLoginError]    = useState("");

  const [registerEmail,    setRegisterEmail]    = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError,    setRegisterError]    = useState("");

  const [googleError, setGoogleError] = useState("");

  //Loading
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log("Usuario autenticado:", firebaseUser);
        setUser(firebaseUser);
        setScreen("user");
      } else {
        console.log("Usuario no autenticado");
        setUser(null);
        setScreen("login");
      }
    });

    return () => unsubscribe();
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError("");
    setIsSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registerEmail,
        registerPassword
      );
      console.log("Usuario registrado:", userCredential.user);
    } catch (error: any) {
      setRegisterError(getErrorMessage(error.code));
      console.error("Error en registro:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        loginPassword
      );
      console.log("Usuario logueado:", userCredential.user);
    } catch (error: any) {
      setLoginError(getErrorMessage(error.code));
      console.error("Error en login:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    setGoogleError("");
    setIsSubmitting(true);

    try {
      const googleProvider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Usuario logueado con Google:", result.user);
    } catch (error: any) {
      setGoogleError(getErrorMessage(error.code));
      console.error("Error en login con Google:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      console.log("Usuario deslogueado");
      setLoginEmail("");
      setLoginPassword("");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  function getCredentials(email: string): string {
    return email.charAt(0).toUpperCase();
  }

  function getProviderName(u: User): string {
    const providerId = u.providerData[0]?.providerId;
    return providerId === "google.com" ? "Google" : "Email / Contraseña";
  }

  return (
    <div className="auth">
      <div className="auth__box">

        <a href="/" className="auth__logo">
          <span className="auth__logo-icon">📖</span>
          <span className="auth__logo-text">Biblós</span>
        </a>

        <div className={screen !== "loading" ? "auth__hidden" : ""}>
          <p className="auth__loading">Comprobando credenciales...</p>
        </div>

        <div className={screen !== "login" ? "auth__hidden" : ""}>
          <h2 className="auth__title">Iniciar Sesión</h2>

          <form className="auth__form" onSubmit={handleLogin}>
            <input
              className="auth__input"
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <input
              className="auth__input"
              type="password"
              placeholder="Contraseña"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <button
              className="auth__btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Entrando..." : "Iniciar Sesión"}
            </button>
            <p className="auth__error">{loginError}</p>
          </form>

          <div className="auth__divider">O</div>

          <button
            className="auth__btn-google"
            type="button"
            onClick={handleGoogle}
            disabled={isSubmitting}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
            />
            Continuar con Google
          </button>
          <p className="auth__error">{googleError}</p>

          <p className="auth__toggle">
            ¿No tienes cuenta?{" "}
            <span
              className="auth__toggle-link"
              onClick={() => {
                setScreen("register");
                setRegisterError("");
                setGoogleError("");
              }}
            >
              Regístrate
            </span>
          </p>
        </div>

        <div className={screen !== "register" ? "auth__hidden" : ""}>
          <h2 className="auth__title">Crear Cuenta</h2>

          <form className="auth__form" onSubmit={handleRegister}>
            <input
              className="auth__input"
              type="email"
              placeholder="Email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
            <input
              className="auth__input"
              type="password"
              placeholder="Contraseña (mín. 6 caracteres)"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              required
            />
            <button
              className="auth__btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Registrando..." : "Registrarse"}
            </button>
            <p className="auth__error">{registerError}</p>
          </form>

          <div className="auth__divider">O</div>

          <button
            className="auth__btn-google"
            type="button"
            onClick={handleGoogle}
            disabled={isSubmitting}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
            />
            Continuar con Google
          </button>
          <p className="auth__error">{googleError}</p>

          <p className="auth__toggle">
            ¿Ya tienes cuenta?{" "}
            <span
              className="auth__toggle-link"
              onClick={() => {
                setScreen("login");
                setLoginError("");
                setGoogleError("");
              }}
            >
              Inicia sesión
            </span>
          </p>
        </div>

        <div className={screen !== "user" ? "auth__hidden" : ""}>
          <div className="auth__user-info">
            <div className="auth__user-avatar">
              {user ? getCredentials(user.email ?? "U") : "U"}
            </div>
            <h2 className="auth__title">Bienvenido</h2>
            <p className="auth__user-email">{user?.email}</p>
            <p className="auth__user-provider">
              Proveedor: {user ? getProviderName(user) : ""}
            </p>
            <button
              className="auth__btn-danger"
              type="button"
              onClick={handleLogout}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
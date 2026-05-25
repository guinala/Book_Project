import { useEffect, useState } from "react";
import type { FieldError, UseFormRegister } from "react-hook-form";
import {
  checkUsernameAvailable,
  isValidUsername,
  normalizeUsername,
} from "@/services/firebase/firebaseUsernames";
import type { EditProfileForm } from "../EditProfilePage";

type UsernameFieldProps = {
  uid: string;
  register: UseFormRegister<EditProfileForm>;
  error: FieldError | undefined;
  value: string;
  originalUsername: string;
};

type Status = "idle" | "checking" | "taken" | "available";

export default function UsernameField({
  uid,
  register,
  error,
  value,
  originalUsername,
}: UsernameFieldProps) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const normalized = normalizeUsername(value);

    if (normalized === "" || normalized === normalizeUsername(originalUsername)) {
      setStatus("idle");
      return;
    }
    if (!isValidUsername(normalized)) {
      setStatus("idle");
      return;
    }

    setStatus("checking");
    let cancelled = false;
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const available = await checkUsernameAvailable(normalized, uid);
          if (!cancelled) setStatus(available ? "available" : "taken");
        } catch {
          if (!cancelled) setStatus("idle");
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, uid, originalUsername]);

  return (
    <div className="edit-profile__field">
      <label className="edit-profile__label" htmlFor="username">Nickname</label>
      <div className="edit-profile__input-prefix-wrap">
        <span className="edit-profile__prefix">@</span>
        <input
          id="username"
          className="edit-profile__input edit-profile__input--with-prefix"
          type="text"
          {...register("username", {
            pattern: {
              value: /^[a-z0-9_]{3,20}$/,
              message: "Solo letras minúsculas, números y _, entre 3 y 20 caracteres",
            },
          })}
        />
      </div>
      {error && <p className="edit-profile__error">{error.message}</p>}
      {status === "checking" && <p className="edit-profile__hint">Comprobando disponibilidad...</p>}
      {status === "taken" && <p className="edit-profile__error">Este nombre ya está en uso</p>}
      {status === "available" && <p className="edit-profile__success">Disponible</p>}
    </div>
  );
}

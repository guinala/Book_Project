// src/pages/EditProfilePage/EditProfilePage.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, updateUserProfile } from "@/services/firebase/firebaseUsers";
import { uploadProfilePhoto, uploadBannerImage } from "@/services/firebase/firebaseStorage";
import type { UserFullProfile } from "@/types/UserProfile";
import { Upload } from "lucide-react";
import "./EditProfilePage.scss";
import { FirebaseError } from "firebase/app";
import { checkUsernameAvailable, isValidUsername, normalizeUsername, setUsername } from "@/services/firebase/firebaseUsernames";

type EditProfileForm = {
  name: string;
  surname: string;
  username: string;
  bio: string;
  isPublic: boolean;
};

export default function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<EditProfileForm>();

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [bioSaveBlocked, setBioSaveBlocked] = useState(false);
  const [bioShaking, setBioShaking] = useState(false);
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "taken" | "available">("idle");

  const BIO_MAX = 300;
  const bioValue = watch("bio") ?? "";
  const usernameValue = watch("username") ?? "";
  const isPublicProfile = watch("isPublic");
  const bioOverLimit = bioValue.length > BIO_MAX;

  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const photoPreviewRef = useRef<string | null>(null);
  const bannerPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    photoPreviewRef.current = photoPreview;
  }, [photoPreview]);

  useEffect(() => {
    bannerPreviewRef.current = bannerPreview;
  }, [bannerPreview]);

  useEffect(() => {
    return () => {
      if (photoPreviewRef.current?.startsWith("blob:")) URL.revokeObjectURL(photoPreviewRef.current);
      if (bannerPreviewRef.current?.startsWith("blob:")) URL.revokeObjectURL(bannerPreviewRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const normalized = normalizeUsername(usernameValue);

    if (normalized === "" || normalized === normalizeUsername(originalUsername)) {
      setUsernameStatus("idle");
      return;
    }

    if (!isValidUsername(normalized)) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    let cancelled = false;
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const available = await checkUsernameAvailable(normalized, user.uid);
          if (!cancelled) setUsernameStatus(available ? "available" : "taken");
        } catch {
          if (!cancelled) setUsernameStatus("idle");
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [usernameValue, user, originalUsername]);

  useEffect(() => {
    if (bioSaveBlocked && !bioOverLimit) setBioSaveBlocked(false);
  }, [bioValue, bioSaveBlocked, bioOverLimit]);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then((profile) => {
        if (profile) {
          reset({
            name: profile.name,
            surname: profile.surname,
            username: profile.username,
            bio: profile.bio,
            isPublic: profile.isPublic ?? true,
          });
          setOriginalUsername(profile.username ?? "");
          if (profile.profilePhotoUrl) setPhotoPreview(profile.profilePhotoUrl);
          if (profile.bannerImageUrl) setBannerPreview(profile.bannerImageUrl);
        }
      })
      .finally(() => setLoadingProfile(false));
  }, [user, reset]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const onSubmit = async (data: EditProfileForm) => {
    if (!user) return;
    if (bioOverLimit) {
      setBioSaveBlocked(true);
      setBioShaking(true);
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      const updates: Partial<Omit<UserFullProfile, "uid" | "email" | "birthDate" | "username">> = {
        name: data.name,
        surname: data.surname,
        bio: data.bio,
        isPublic: data.isPublic,
      };

      if (photoFile) {
        updates.profilePhotoUrl = await uploadProfilePhoto(user.uid, photoFile);
      }

      if (bannerFile) {
        updates.bannerImageUrl = await uploadBannerImage(user.uid, bannerFile);
      }

      const normalizedNew = normalizeUsername(data.username);
      const normalizedOld = normalizeUsername(originalUsername);
      if (normalizedNew !== normalizedOld && normalizedNew !== "") {
        try {
          await setUsername(user.uid, normalizedNew, normalizedOld || undefined);
        } catch (err) {
          if (err instanceof Error && err.message === "USERNAME_TAKEN") {
            setSaveError("Ese nombre de usuario ya está en uso.");
            return;
          }
          throw err;
        }
      }

      await updateUserProfile(user.uid, updates);

      navigate("/profile");
    } catch (err) {
      console.error("[EditProfilePage] save failed:", err);

      if (err instanceof FirebaseError) {
        setSaveError(err.code);
      } 
      else if (err instanceof Error) {
        setSaveError(err.message);
      } 
      else {
        setSaveError("Error desconocido");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="edit-profile edit-profile--loading">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <section className="edit-profile">
      <h2 className="edit-profile__title">Editar perfil</h2>

      <form className="edit-profile__form" onSubmit={handleSubmit(onSubmit)}>

        <div className="edit-profile__field">
          <span className="edit-profile__label">Foto de portada</span>
          <div className="edit-profile__banner-upload">
            <div
              className="edit-profile__banner-preview"
              style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : undefined}
              onClick={() => bannerInputRef.current?.click()}
            >
              {!bannerPreview && (
                <span className="edit-profile__upload-hint">Subir portada</span>
              )}
              <div className="edit-profile__banner-overlay">
                <Upload size={24} aria-hidden="true" />
              </div>
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="edit-profile__file-input"
              onChange={handleBannerChange}
              aria-label="Subir imagen de portada"
            />
          </div>
        </div>

        <div className="edit-profile__field">
          <span className="edit-profile__label">Foto de perfil</span>
          <div className="edit-profile__photo-upload">
            <div
              className="edit-profile__photo-preview"
              onClick={() => photoInputRef.current?.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Foto de perfil" className="edit-profile__photo-img" />
              ) : (
                <span className="edit-profile__upload-hint">Foto</span>
              )}
              <div className="edit-profile__photo-overlay">
                <Upload size={20} aria-hidden="true" />
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="edit-profile__file-input"
              onChange={handlePhotoChange}
              aria-label="Subir foto de perfil"
            />
          </div>
        </div>

        <div className="edit-profile__fields">
          <div className="edit-profile__row">
            <div className="edit-profile__field">
              <label className="edit-profile__label" htmlFor="name">Nombre</label>
              <input
                id="name"
                className="edit-profile__input"
                type="text"
                {...register("name", { required: "El nombre es obligatorio" })}
              />
              {errors.name && (
                <p className="edit-profile__error">{errors.name.message}</p>
              )}
            </div>

            <div className="edit-profile__field">
              <label className="edit-profile__label" htmlFor="surname">Apellido</label>
              <input
                id="surname"
                className="edit-profile__input"
                type="text"
                {...register("surname")}
              />
            </div>
          </div>

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
            {errors.username && (
              <p className="edit-profile__error">{errors.username.message}</p>
            )}
            {usernameStatus === "checking" && (
              <p className="edit-profile__hint">Comprobando disponibilidad...</p>
            )}
            {usernameStatus === "taken" && (
              <p className="edit-profile__error">Este nombre ya está en uso</p>
            )}
            {usernameStatus === "available" && (
              <p className="edit-profile__success">Disponible</p>
            )}
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="bio">Biografía</label>
            <textarea
              id="bio"
              className={[
                "edit-profile__textarea",
                bioSaveBlocked && bioOverLimit ? "edit-profile__textarea--error" : "",
                bioShaking ? "edit-profile__textarea--shaking" : "",
              ].filter(Boolean).join(" ")}
              rows={4}
              onAnimationEnd={() => setBioShaking(false)}
              {...register("bio")}
            />
            <div className="edit-profile__bio-footer">
              {bioSaveBlocked && bioOverLimit && (
                <span className="edit-profile__bio-error">Demasiados caracteres</span>
              )}
              <span className={`edit-profile__bio-count${bioOverLimit ? " edit-profile__bio-count--over" : ""}`}>
                {bioValue.length} / {BIO_MAX} caracteres
              </span>
            </div>
          </div>
          <div className="edit-profile__field">
            <span className="edit-profile__label">Privacidad del perfil</span>
            <div className="edit-profile__privacy">
              <label className="edit-profile__switch">
                <input type="checkbox" {...register("isPublic")} />
                <span className="edit-profile__switch-track" />
              </label>
              <p className="edit-profile__privacy-text">
                {isPublicProfile
                  ? "Cualquiera puede ver tu actividad y estantería"
                  : "Solo tus seguidores podrán ver tu estantería y actividad"}
              </p>
            </div>
          </div>
        </div>

        {saveError && (
          <p className="edit-profile__save-error">{saveError}</p>
        )}

        <div className="edit-profile__actions">
          <button
            type="button"
            className="edit-profile__btn edit-profile__btn--cancel"
            onClick={() => navigate("/profile")}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="edit-profile__btn edit-profile__btn--save"
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}

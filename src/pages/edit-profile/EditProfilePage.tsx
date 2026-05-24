import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, updateUserProfile } from "@/services/firebase/firebaseUsers";
import { uploadProfilePhoto, uploadBannerImage } from "@/services/firebase/firebaseStorage";
import { normalizeUsername, setUsername } from "@/services/firebase/firebaseUsernames";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { logger } from "@/utils/logger";
import type { UserFullProfile } from "@/types/UserProfile";
import "./EditProfilePage.scss";
import AvatarUploader from "./components/AvatarUploader";
import BannerUploader from "./components/BannerUploader";
import UsernameField from "./components/UsernameField";
import BioField from "./components/BioField";

type EditProfileForm = {
  name: string;
  surname: string;
  username: string;
  bio: string;
  isPublic: boolean;
};

const BIO_MAX = 150;

export default function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<EditProfileForm>();

  const photo = useObjectUrl(null);
  const banner = useObjectUrl(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [bioSaveBlocked, setBioSaveBlocked] = useState(false);
  const [bioShaking, setBioShaking] = useState(false);
  const [originalUsername, setOriginalUsername] = useState("");

  const bioValue = watch("bio") ?? "";
  const usernameValue = watch("username") ?? "";
  const isPublicProfile = watch("isPublic");

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
          if (profile.profilePhotoUrl) photo.setUrl(profile.profilePhotoUrl);
          if (profile.bannerImageUrl) banner.setUrl(profile.bannerImageUrl);
        }
      })
      .finally(() => setLoadingProfile(false));
  }, [user, reset, photo, banner]);

  const handlePhotoSelected = (file: File) => {
    setPhotoFile(file);
    photo.setFile(file);
  };

  const handleBannerSelected = (file: File) => {
    setBannerFile(file);
    banner.setFile(file);
  };

  const onSubmit = async (data: EditProfileForm) => {
    if (!user) return;
    if (bioValue.length > BIO_MAX) {
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
      if (photoFile) updates.profilePhotoUrl = await uploadProfilePhoto(user.uid, photoFile);
      if (bannerFile) updates.bannerImageUrl = await uploadBannerImage(user.uid, bannerFile);

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
      logger.error("[EditProfilePage] save failed:", err);
      if (err instanceof FirebaseError) setSaveError(err.code);
      else if (err instanceof Error) setSaveError(err.message);
      else setSaveError("Error desconocido");
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

  if (!user) return null;

  return (
    <section className="edit-profile">
      <h2 className="edit-profile__title">Editar perfil</h2>

      <form className="edit-profile__form" onSubmit={handleSubmit(onSubmit)}>
        <BannerUploader previewUrl={banner.url} onFileSelected={handleBannerSelected} />
        <AvatarUploader previewUrl={photo.url} onFileSelected={handlePhotoSelected} />

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
              {errors.name && <p className="edit-profile__error">{errors.name.message}</p>}
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

          <UsernameField
            uid={user.uid}
            register={register}
            error={errors.username}
            value={usernameValue}
            originalUsername={originalUsername}
          />

          <BioField
            register={register}
            value={bioValue}
            saveBlocked={bioSaveBlocked}
            onClearBlock={() => setBioSaveBlocked(false)}
            shaking={bioShaking}
            onShakeEnd={() => setBioShaking(false)}
          />

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

        {saveError && <p className="edit-profile__save-error">{saveError}</p>}

        <div className="edit-profile__actions">
          <button type="button" className="edit-profile__btn edit-profile__btn--cancel" onClick={() => navigate("/profile")}>
            Cancelar
          </button>
          <button type="submit" className="edit-profile__btn edit-profile__btn--save" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}

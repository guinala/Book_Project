import { useRef } from "react";
import { Upload } from "lucide-react";

type AvatarUploaderProps = {
  previewUrl: string | null;
  onFileSelected: (file: File) => void;
};

export default function AvatarUploader({ previewUrl, onFileSelected }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="edit-profile__field">
      <span className="edit-profile__label">Foto de perfil</span>
      <div className="edit-profile__photo-upload">
        <div
          className="edit-profile__photo-preview"
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Foto de perfil" className="edit-profile__photo-img" />
          ) : (
            <span className="edit-profile__upload-hint">Foto</span>
          )}
          <div className="edit-profile__photo-overlay">
            <Upload size={20} aria-hidden="true" />
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="edit-profile__file-input"
          onChange={handleChange}
          aria-label="Subir foto de perfil"
        />
      </div>
    </div>
  );
}

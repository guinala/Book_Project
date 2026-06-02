import { useRef } from "react";
import { Upload } from "lucide-react";

type BannerUploaderProps = {
  previewUrl: string | null;
  onFileSelected: (file: File) => void;
};

export default function BannerUploader({ previewUrl, onFileSelected }: BannerUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="edit-profile__field">
      <span className="edit-profile__label">Foto de portada</span>
      <div className="edit-profile__banner-upload">
        <div
          className="edit-profile__banner-preview"
          style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
          onClick={() => inputRef.current?.click()}
        >
          {!previewUrl && <span className="edit-profile__upload-hint">Subir portada</span>}
          <div className="edit-profile__banner-overlay">
            <Upload size={24} aria-hidden="true" />
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="edit-profile__file-input"
          onChange={handleChange}
          aria-label="Subir imagen de portada"
        />
      </div>
    </div>
  );
}

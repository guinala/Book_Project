// src/services/firebase/firebaseStorage.ts
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebaseInit";

async function compressImage(
  file: File,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2D canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Canvas compression failed")),
        "image/jpeg",
        quality
      );
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(e);
    };
    img.src = objectUrl;
  });
}

export async function uploadProfilePhoto(
  uid: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file, 400, 0.85);
  const storageRef = ref(storage, `users/${uid}/profile-photo.jpg`);
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

export async function uploadBannerImage(
  uid: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file, 1200, 0.85);
  const storageRef = ref(storage, `users/${uid}/banner.jpg`);
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

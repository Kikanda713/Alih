import { cloudinary, isCloudinaryConfigured } from "../auth/config";

/**
 * Téléverse un fichier directement vers Cloudinary (preset non signé, comme
 * Wanzo) et renvoie l'URL sécurisée. Aucun passage par notre backend.
 * `resource` : 'image' (défaut) ou 'video'.
 */
async function upload(file, resource = "image") {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary non configuré (VITE_CLOUDINARY_*).");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", cloudinary.uploadPreset);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/${resource}/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    throw new Error("Échec du téléversement.");
  }
  const data = await res.json();
  return data.secure_url;
}

export function uploadImage(file) {
  return upload(file, "image");
}

/** Téléverse une vidéo courte de présentation (resource_type=video). */
export function uploadVideo(file) {
  return upload(file, "video");
}

export { isCloudinaryConfigured };

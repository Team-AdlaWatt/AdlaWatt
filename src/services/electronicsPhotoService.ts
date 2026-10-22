import { supabase } from "@/lib/supabase";

// ============================================================
// ELECTRONICS PHOTO SERVICE
// ============================================================
//
// Custom electronics photos live in the public
// `appliance-images` bucket under <user_id>/ filenames, so
// box/list images load via plain public URLs. Filenames are
// client-generated (uuid-style), so an upload never depends
// on the row existing first: Add uploads, then inserts the
// row with image_url; replace uploads the new object, swaps
// the row, then deletes the old object best-effort.
// ============================================================

const BUCKET = "appliance-images";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const randomFileId = (): string =>
  `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

const extensionForMimeType = (
  mimeType?: string,
): { extension: string; contentType: string } => {
  if (mimeType === "image/png") {
    return { extension: "png", contentType: "image/png" };
  }

  return { extension: "jpg", contentType: "image/jpeg" };
};

const isNetworkMessage = (message: string): boolean => {
  const lower = message.toLowerCase();

  return (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("offline") ||
    lower.includes("timeout") ||
    lower.includes("unreachable")
  );
};

// Public URL → bucket-relative path (<user_id>/<file>).
// Null when the URL is not one of ours (e.g. a remote
// placeholder): deletion is a no-op in that case.
const pathForPublicUrl = (url: string): string | null => {
  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);

  if (index < 0) {
    return null;
  }

  const path = url
    .slice(index + marker.length)
    .split("?")[0];

  return path || null;
};

export async function uploadElectronicsPhoto(
  userId: string,
  localUri: string,
  mimeType?: string,
) {
  try {
    if (!userId) {
      return {
        success: false,
        error: "You must be signed in to add a photo.",
      };
    }

    const { extension, contentType } =
      extensionForMimeType(mimeType);

    const path = `${userId}/${randomFileId()}.${extension}`;

    const response = await fetch(localUri);
    const blob = await response.blob();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType,
        upsert: false,
      });

    if (error) {
      if (isNetworkMessage(error.message)) {
        return {
          success: false,
          error: "No connection. Check your internet and try again.",
        };
      }

      return {
        success: false,
        error: "Unable to upload that photo. Please try again.",
      };
    }

    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      return {
        success: false,
        error: "Unable to upload that photo. Please try again.",
      };
    }

    return { success: true, url: data.publicUrl };
  } catch {
    return {
      success: false,
      error: "Unable to upload that photo. Please try again.",
    };
  }
}

export async function deleteElectronicsPhotoByUrl(
  url: string,
) {
  try {
    const path = pathForPublicUrl(url);

    if (!path) {
      return { success: true };
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Unable to delete that photo.",
    };
  }
}

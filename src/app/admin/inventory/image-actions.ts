"use server";

// Material photo bytes are uploaded directly from the browser to Supabase Storage.
// The server issues one-time signed URLs and publishes a key only after all three
// objects (original, display WebP, thumbnail WebP) are confirmed.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/account-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVENTORY_BUCKET, imagePaths } from "@/lib/inventory/inventory-images";

export type PreparedUpload =
  | { error: string }
  | {
      key: string;
      original: { path: string; token: string };
      full: { path: string; token: string };
      thumb: { path: string; token: string };
    };

export type ImageResult = { ok?: string; error?: string };

const refresh = () => revalidatePath("/admin/inventory", "layout");
const KEY_RE = /^materials\/[0-9a-f-]{36}\/v2-[0-9a-f]{12}$/;

export async function prepareMaterialImageUpload(
  materialId: string,
  originalExtension: string,
): Promise<PreparedUpload> {
  await requireAdmin();
  if (!isUuid(materialId)) return { error: "Invalid material." };
  if (!["jpg", "png", "webp"].includes(originalExtension)) {
    return { error: "Use a JPG, PNG, or WebP image." };
  }

  const admin = createAdminClient();
  const { data: material, error: materialError } = await admin
    .from("inv_materials")
    .select("id")
    .eq("id", materialId)
    .maybeSingle();

  if (materialError || !material) return { error: "Material not found." };

  const key = `materials/${materialId}/v2-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const paths = imagePaths(key);
  const storage = admin.storage.from(INVENTORY_BUCKET);
  const [original, full, thumb] = await Promise.all([
    storage.createSignedUploadUrl(paths.original),
    storage.createSignedUploadUrl(paths.full),
    storage.createSignedUploadUrl(paths.thumb),
  ]);

  if (original.error || full.error || thumb.error || !original.data || !full.data || !thumb.data) {
    console.error("Inventory image: signed upload failed:", original.error ?? full.error ?? thumb.error);
    return { error: "Could not start the upload. Check that the inventory-images bucket exists and is writable." };
  }

  return {
    key,
    original: { path: paths.original, token: original.data.token },
    full: { path: paths.full, token: full.data.token },
    thumb: { path: paths.thumb, token: thumb.data.token },
  };
}

export async function saveMaterialImage(materialId: string, key: string): Promise<ImageResult> {
  await requireAdmin();
  if (!isUuid(materialId) || !KEY_RE.test(key) || !key.startsWith(`materials/${materialId}/`)) {
    return { error: "Invalid image." };
  }

  const admin = createAdminClient();
  const storage = admin.storage.from(INVENTORY_BUCKET);
  const paths = imagePaths(key);
  const [original, full, thumb] = await Promise.all([
    storage.exists(paths.original),
    storage.exists(paths.full),
    storage.exists(paths.thumb),
  ]);

  if (!original.data || !full.data || !thumb.data) {
    await storage.remove([paths.original, paths.full, paths.thumb]);
    return { error: "The original or optimized image upload didn't finish. Please try again." };
  }

  const { data: existing, error: readError } = await admin
    .from("inv_materials")
    .select("image_key")
    .eq("id", materialId)
    .maybeSingle();
  if (readError || !existing) {
    await storage.remove([paths.original, paths.full, paths.thumb]);
    return { error: "Could not load the material record." };
  }

  const { error } = await admin.from("inv_materials").update({ image_key: key }).eq("id", materialId);
  if (error) {
    console.error("Inventory image: save failed:", error);
    await storage.remove([paths.original, paths.full, paths.thumb]);
    return { error: "Could not save the photo. Check the inventory image_key column and permissions." };
  }

  if (existing.image_key && existing.image_key !== key) {
    const old = imagePaths(existing.image_key);
    await storage.remove([old.original, old.full, old.thumb].filter(Boolean));
  }
  refresh();
  return { ok: "Photo saved." };
}

export async function removeMaterialImage(materialId: string): Promise<ImageResult> {
  await requireAdmin();
  if (!isUuid(materialId)) return { error: "Invalid material." };

  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin
    .from("inv_materials")
    .select("image_key")
    .eq("id", materialId)
    .maybeSingle();
  if (readError) return { error: "Could not load the material record." };
  if (!existing?.image_key) return { ok: "No photo to remove." };

  const { error } = await admin.from("inv_materials").update({ image_key: null }).eq("id", materialId);
  if (error) {
    console.error("Inventory image: remove failed:", error);
    return { error: "Could not remove the photo." };
  }

  const old = imagePaths(existing.image_key);
  await admin.storage.from(INVENTORY_BUCKET).remove([old.original, old.full, old.thumb].filter(Boolean));
  refresh();
  return { ok: "Photo removed." };
}

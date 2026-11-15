"use server";

// Server side of material photos. The photo bytes never pass through this server:
// the browser shrinks the photo, then uploads straight to Supabase Storage using
// one-time signed upload URLs created here. That keeps admin uploads off the
// serverless functions that serve customers (and avoids Vercel's ~4.5 MB body limit).

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/account-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVENTORY_BUCKET, imagePaths } from "@/lib/inventory/inventory-images";

export type PreparedUpload =
  | { error: string }
  | { key: string; full: { path: string; token: string }; thumb: { path: string; token: string } };

export type ImageResult = { ok?: string; error?: string };

// Only touches admin pages. Never revalidate customer routes from here.
const refresh = () => revalidatePath("/admin/inventory", "layout");
const KEY_RE = /^materials\/[0-9a-f-]{36}\/[0-9a-f]{12}$/;

export async function prepareMaterialImageUpload(materialId: string): Promise<PreparedUpload> {
  await requireAdmin();
  if (!isUuid(materialId)) return { error: "Invalid material." };

  const admin = createAdminClient();
  const { data: material } = await admin.from("inv_materials").select("id").eq("id", materialId).maybeSingle();
  if (!material) return { error: "Material not found." };

  const key = `materials/${materialId}/${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const paths = imagePaths(key);
  const storage = admin.storage.from(INVENTORY_BUCKET);
  const [full, thumb] = await Promise.all([
    storage.createSignedUploadUrl(paths.full),
    storage.createSignedUploadUrl(paths.thumb),
  ]);
  if (full.error || thumb.error || !full.data || !thumb.data) {
    console.error("Inventory image: signed upload failed:", full.error ?? thumb.error);
    return { error: "Could not start the upload. Has the inventory-images bucket been created (see the SQL file)?" };
  }
  return {
    key,
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

  // Make sure both files really arrived before pointing the material at them.
  const [full, thumb] = await Promise.all([storage.exists(paths.full), storage.exists(paths.thumb)]);
  if (!full.data || !thumb.data) return { error: "The upload didn't finish. Please try again." };

  const { data: existing } = await admin.from("inv_materials").select("image_key").eq("id", materialId).maybeSingle();
  const { error } = await admin.from("inv_materials").update({ image_key: key }).eq("id", materialId);
  if (error) {
    console.error("Inventory image: save failed:", error);
    await storage.remove([paths.full, paths.thumb]);
    return { error: "Could not save the photo. Has the image_key column been added (see the SQL file)?" };
  }

  if (existing?.image_key && existing.image_key !== key) {
    const old = imagePaths(existing.image_key);
    await storage.remove([old.full, old.thumb]);
  }
  refresh();
  return { ok: "Photo saved." };
}

export async function removeMaterialImage(materialId: string): Promise<ImageResult> {
  await requireAdmin();
  if (!isUuid(materialId)) return { error: "Invalid material." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("inv_materials").select("image_key").eq("id", materialId).maybeSingle();
  if (!existing?.image_key) return { ok: "No photo to remove." };

  const { error } = await admin.from("inv_materials").update({ image_key: null }).eq("id", materialId);
  if (error) {
    console.error("Inventory image: remove failed:", error);
    return { error: "Could not remove the photo." };
  }
  const old = imagePaths(existing.image_key);
  await admin.storage.from(INVENTORY_BUCKET).remove([old.full, old.thumb]);
  refresh();
  return { ok: "Photo removed." };
}

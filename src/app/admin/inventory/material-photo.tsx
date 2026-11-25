"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INVENTORY_BUCKET, materialImageUrl } from "@/lib/inventory/inventory-images";
import { createOptimizedWebp, getSafeImageExtension } from "@/lib/images/browser";
import { prepareMaterialImageUpload, removeMaterialImage, saveMaterialImage } from "./image-actions";
import { btnGhost, btnPrimary, Card } from "./ui";

// ---------------------------------------------------------------- shared image preparation and direct storage upload

async function uploadMaterialImage(materialId: string, file: File) {
  if (file.size > 40 * 1024 * 1024) throw new Error("That photo is too large (40 MB max).");
  const extension = getSafeImageExtension(file.type);
  if (!extension) throw new Error("Use a JPG, PNG, or WebP image so the original can be preserved.");

  const [full, thumb] = await Promise.all([
    createOptimizedWebp(file, "display"),
    createOptimizedWebp(file, "thumbnail"),
  ]);
  const prepared = await prepareMaterialImageUpload(materialId, extension);
  if ("error" in prepared) throw new Error(prepared.error);

  // Upload the untouched source plus lightweight derivatives directly to Storage.
  const storage = createClient().storage.from(INVENTORY_BUCKET);
  const originalUpload = await storage.uploadToSignedUrl(
    prepared.original.path,
    prepared.original.token,
    file,
    { contentType: file.type, cacheControl: "31536000" },
  );
  if (originalUpload.error) {
    await storage.remove([prepared.original.path, prepared.full.path, prepared.thumb.path]);
    throw new Error("Original upload failed. Check your connection and try again.");
  }

  const [displayUpload, thumbnailUpload] = await Promise.all([
    storage.uploadToSignedUrl(prepared.full.path, prepared.full.token, full, {
      contentType: "image/webp",
      cacheControl: "31536000",
    }),
    storage.uploadToSignedUrl(prepared.thumb.path, prepared.thumb.token, thumb, {
      contentType: "image/webp",
      cacheControl: "31536000",
    }),
  ]);

  if (displayUpload.error || thumbnailUpload.error) {
    await storage.remove([prepared.original.path, prepared.full.path, prepared.thumb.path]);
    throw new Error("Optimized image upload failed. Please try again.");
  }

  const saved = await saveMaterialImage(materialId, prepared.key);
  if (saved.error) throw new Error(saved.error);
}

function useUpload(materialId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadMaterialImage(materialId, file);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, upload, setError };
}

// ---------------------------------------------------------------- detail page card

export function MaterialPhoto({ materialId, imageKey, title }: { materialId: string; imageKey: string | null; title: string }) {
  const router = useRouter();
  const { busy, error, upload, setError } = useUpload(materialId);
  const input = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);
  const full = materialImageUrl(imageKey, "full");

  async function remove() {
    if (!window.confirm("Remove this photo?")) return;
    setRemoving(true);
    setError(null);
    const res = await removeMaterialImage(materialId);
    setRemoving(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  return (
    <Card>
      <p className="text-xs font-black uppercase tracking-wider text-black/45">Photo</p>
      {full ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={full} alt={title} loading="lazy" decoding="async" className="mt-3 max-h-80 w-full rounded-2xl bg-black/5 object-contain" />
      ) : (
        <div className="mt-3 flex h-40 items-center justify-center rounded-2xl border border-dashed border-black/20 text-sm text-neutral-600">
          No photo yet
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void upload(file);
        }}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy || removing} onClick={() => input.current?.click()} className={btnPrimary}>
          {busy ? "Uploading…" : full ? "Replace photo" : "Add photo"}
        </button>
        {full ? (
          <button type="button" disabled={busy || removing} onClick={remove} className={btnGhost}>
            {removing ? "Removing…" : "Remove"}
          </button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm font-bold text-red-800">{error}</p> : null}
    </Card>
  );
}

// ---------------------------------------------------------------- list / gallery thumbnail

export function MaterialThumb({
  materialId,
  imageKey,
  title,
  fill = false,
}: {
  materialId: string;
  imageKey: string | null;
  title: string;
  fill?: boolean;
}) {
  const { busy, error, upload } = useUpload(materialId);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const thumb = materialImageUrl(imageKey, "thumb");
  const full = materialImageUrl(imageKey, "full");
  const box = fill ? "aspect-square w-full" : "h-14 w-14 shrink-0 rounded-xl";

  if (thumb && full) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            dialog.current?.showModal();
          }}
          aria-label={`View photo of ${title}`}
          className={`${box} block overflow-hidden bg-black/5`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" loading="lazy" decoding="async" width={360} height={360} className="h-full w-full object-cover" />
        </button>
        <dialog
          ref={dialog}
          onClose={() => setOpen(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) e.currentTarget.close();
          }}
          className="m-auto max-h-[92vh] max-w-[92vw] rounded-2xl bg-white p-3 backdrop:bg-black/70"
        >
          {/* The full-size photo is only requested once someone opens it. */}
          {open ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={full} alt={title} className="max-h-[78vh] max-w-full rounded-xl object-contain" />
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-sm font-black">{title}</p>
            <button type="button" onClick={() => dialog.current?.close()} className={btnGhost}>
              Close
            </button>
          </div>
        </dialog>
      </>
    );
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void upload(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        title={error ?? "Add a photo"}
        aria-label={`Add photo for ${title}`}
        className={`${box} flex items-center justify-center border border-dashed text-center text-[11px] font-black leading-tight transition hover:bg-black/5 ${error ? "border-red-400 text-red-800" : "border-black/25 text-black/55"}`}
      >
        {busy ? "Uploading…" : error ? "Retry" : fill ? "+ Add photo" : "+ Photo"}
      </button>
    </>
  );
}

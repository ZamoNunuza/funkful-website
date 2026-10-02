"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type Product = { id: string; name: string; slug: string | null; brand: string; category: string; is_active: boolean };
type ProductImage = { id: string; product_id: string; image_url: string; alt_text: string | null; is_primary: boolean; sort_order: number };

export default function ProductImageManager({ products, initialImages }: { products: Product[]; initialImages: ProductImage[] }) {
  const [selectedId, setSelectedId] = useState(products.find((p) => p.id.startsWith("original-"))?.id ?? products[0]?.id ?? "");
  const [images, setImages] = useState(initialImages);
  const [files, setFiles] = useState<File[]>([]);
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((product) => product.id === selectedId);
  const selectedImages = useMemo(() => images.filter((image) => image.product_id === selectedId).sort((a, b) => a.sort_order - b.sort_order), [images, selectedId]);

  function chooseProduct(id: string) {
    setSelectedId(id);
    setFiles([]);
    setMessage("");
    const primary = images.find((image) => image.product_id === id && image.is_primary);
    setAltText(primary?.alt_text ?? "");
  }

  /*async function upload() {
    if (!selectedProduct || !files.length) return;
    setBusy(true);
    setMessage("");
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("productId", selectedProduct.id);
        form.set("altText", altText || selectedProduct.name);
        form.set("file", file);
        const response = await fetch("/api/admin/product-images", { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Upload failed.");
        setImages((current) => [...current, result.image]);
      }
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      setMessage(`${files.length} image${files.length === 1 ? "" : "s"} uploaded and linked.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }*/
 async function upload() {
  if (!selectedProduct || files.length === 0) return;

  setBusy(true);
  setMessage("");

  let uploadedCount = 0;

  try {
    for (const file of files) {
      const form = new FormData();

      form.append("productId", selectedProduct.id);
      form.append(
        "altText",
        altText.trim() || selectedProduct.name
      );
      form.append("file", file);

      const response = await fetch(
        "/api/admin/product-images",
        {
          method: "POST",
          body: form,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Failed to upload ${file.name}.`
        );
      }

      if (result.image) {
        setImages((current) => [
          ...current,
          result.image as ProductImage,
        ]);
      }

      uploadedCount++;
    }

    setFiles([]);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    setMessage(
      `${uploadedCount} image${
        uploadedCount === 1 ? "" : "s"
      } uploaded and linked successfully.`
    );
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Upload failed."
    );
  } finally {
    setBusy(false);
  }
}

  async function protectExistingImages() {
    if (!window.confirm("Protect all existing product images now? This will create private originals and watermarked previews, then make the old public bucket private.")) return;
    setBusy(true);
    setMessage("Protecting existing images…");
    try {
      const response = await fetch("/api/admin/product-images/migrate", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.warning || "Image protection migration failed.");
      setMessage(`Protection complete: ${result.migrated} migrated, ${result.failed} failed. ${result.legacyBucketPrivate ? "Legacy bucket is now private." : "Legacy bucket remains public until failures are resolved."}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Protection migration failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveOrder(next: ProductImage[]) {
    setImages((current) => current.map((image) => next.find((item) => item.id === image.id) ?? image));
    const response = await fetch("/api/admin/product-images/reorder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: selectedId, imageIds: next.map((image) => image.id), primaryId: next.find((image) => image.is_primary)?.id ?? next[0]?.id }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save image order.");
  }

  async function makePrimary(id: string) {
    const next = selectedImages.map((image) => ({ ...image, is_primary: image.id === id }));
    try { await saveOrder(next); setMessage("Primary image updated."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update primary image."); }
  }

  async function move(id: string, direction: -1 | 1) {
    const index = selectedImages.findIndex((image) => image.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= selectedImages.length) return;
    const next = [...selectedImages];
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((image, i) => { image.sort_order = i; });
    try { await saveOrder(next); setMessage("Gallery order saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save order."); }
  }

  async function remove(image: ProductImage) {
    if (!window.confirm(`Remove this image from ${selectedProduct?.name}?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/product-images", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: image.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Delete failed.");
      setImages((current) => current.filter((item) => item.id !== image.id));
      setMessage("Image removed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Delete failed."); } finally { setBusy(false); }
  }

  async function saveAlt(image: ProductImage, value: string) {
    const response = await fetch("/api/admin/product-images/update", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: image.id, altText: value }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save alt text.");
    setImages((current) => current.map((item) => item.id === image.id ? { ...item, alt_text: value || null } : item));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="rounded-3xl border border-black/10 bg-[#FAF8F4] p-5">
        <label className="mb-2 block text-xs font-black uppercase tracking-wide">Product</label>
        <select value={selectedId} onChange={(event) => chooseProduct(event.target.value)} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm">
          {products.map((product) => <option key={product.id} value={product.id}>{product.brand} · {product.name}</option>)}
        </select>
        {selectedProduct && <div className="mt-5 rounded-2xl bg-white p-4 text-xs"><p className="font-black">{selectedProduct.name}</p><p className="mt-1 text-neutral-500">{selectedProduct.id}</p><p className="mt-3 font-bold">{selectedImages.length} linked image{selectedImages.length === 1 ? "" : "s"}</p></div>}
        <button type="button" onClick={protectExistingImages} disabled={busy} className="mb-5 w-full rounded-2xl border border-black/10 bg-black px-4 py-3 text-left text-white disabled:opacity-50">
          <span className="block text-xs font-black uppercase tracking-wide">Protect existing images</span>
          <span className="mt-1 block text-[11px] leading-5 text-white/70">Move originals to private storage and generate watermarked previews.</span>
        </button>
        <div className="mt-5 rounded-2xl border border-dashed border-black/20 bg-white p-4">
          <p className="text-xs font-black uppercase">Upload</p>
          <p className="mt-1 text-[11px] leading-5 text-neutral-500">JPG, PNG or WebP · max 5 MB each. WebP is preferred for product photography.</p>
         <input
    ref={fileRef}
    type="file"
    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
    multiple
    onChange={(event) => {
      const selectedFiles = Array.from(event.target.files ?? []);

      const validFiles = selectedFiles.filter((file) => {
        const validType = [
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type);

        const validSize = file.size <= 5 * 1024 * 1024;

        return validType && validSize;
      });

      setFiles(validFiles);

      if (validFiles.length !== selectedFiles.length) {
        setMessage("Only JPG, PNG or WebP images up to 5 MB are allowed.");
      } else {
        setMessage("");
      }
    }}
    className="hidden"
  />

  {/* Clickable upload area */}
  <button
    type="button"
    onClick={() => fileRef.current?.click()}
    disabled={busy}
    className="mt-4 flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/15 bg-[#FAF8F4] px-4 py-6 text-center transition hover:border-black/30 hover:bg-[#F5EFE6] disabled:cursor-not-allowed disabled:opacity-50"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="mb-3 h-8 w-8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5"
      />
    </svg>

    <span className="text-xs font-black uppercase tracking-wide">
      Choose image{files.length === 0 ? "s" : ""}
    </span>

    <span className="mt-1 text-[11px] text-neutral-500">
      Click to browse your computer
    </span>
  </button>

  {/* Selected files */}
  {files.length > 0 && (
    <div className="mt-3 rounded-xl bg-[#FAF8F4] p-3">
      <p className="mb-2 text-[10px] font-black uppercase tracking-wide">
        Selected files
      </p>

      <div className="space-y-1">
        {files.map((file) => (
          <div
            key={`${file.name}-${file.size}-${file.lastModified}`}
            className="flex items-center justify-between gap-3 text-[11px]"
          >
            <span className="min-w-0 truncate font-medium">
              {file.name}
            </span>

            <span className="shrink-0 text-neutral-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        ))}
      </div>
    </div>
  )}

  <input
    value={altText}
    onChange={(event) => setAltText(event.target.value)}
    placeholder={selectedProduct?.name ?? "Alt text"}
    className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs outline-none focus:border-black/30"
  />

  <button
    type="button"
    disabled={!files.length || busy}
    onClick={upload}
    className="mt-3 w-full rounded-xl bg-black px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
  >
    {busy
      ? "Uploading…"
      : `Upload ${files.length || ""} image${files.length === 1 ? "" : "s"}`}
  </button>
        </div>
        {message && <p className="mt-4 rounded-xl bg-[#EBC6C2]/40 px-3 py-3 text-xs leading-5">{message}</p>}
      </aside>

      <section className="rounded-3xl border border-black/10 bg-[#FAF8F4] p-5 sm:p-7">
        <div className="mb-5"><p className="text-xs font-black uppercase tracking-wide">Gallery</p><p className="mt-1 text-xs text-neutral-500">The primary image is used first on the Originals grid. Gallery order controls the product detail gallery.</p></div>
        {selectedImages.length === 0 ? <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-neutral-500">No images linked yet. Upload the first image from the left.</div> :
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {selectedImages.map((image, index) => (
              <article key={image.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                <div className="relative aspect-square bg-[#F2E7D5]">
                  <Image src={image.image_url} alt={image.alt_text || selectedProduct?.name || "Product image"} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 300px" className="object-contain p-3" />
                  {image.is_primary && <span className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white">Primary</span>}
                </div>
                <div className="space-y-3 p-4">
                  <input defaultValue={image.alt_text ?? ""} onBlur={(event) => saveAlt(image, event.target.value).catch((error) => setMessage(error instanceof Error ? error.message : "Could not save alt text."))} aria-label="Alt text" className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs" />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => makePrimary(image.id)} disabled={image.is_primary} className="rounded-lg border border-black/10 px-3 py-2 text-[10px] font-black uppercase disabled:opacity-35">Primary</button>
                    <button type="button" onClick={() => move(image.id, -1)} disabled={index === 0} className="rounded-lg border border-black/10 px-3 py-2 text-[10px] font-black disabled:opacity-35" aria-label="Move image left">←</button>
                    <button type="button" onClick={() => move(image.id, 1)} disabled={index === selectedImages.length - 1} className="rounded-lg border border-black/10 px-3 py-2 text-[10px] font-black disabled:opacity-35" aria-label="Move image right">→</button>
                    <button type="button" onClick={() => remove(image)} disabled={busy} className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-[10px] font-black text-red-700">Remove</button>
                  </div>
                </div>
              </article>
            ))}
          </div>}
      </section>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";

type ProductImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
  fallbackImage: string;
  fallbackBackground: string;
};

export default function ProductGallery({
  images,
  productName,
  fallbackImage,
  fallbackBackground,
}: ProductGalleryProps) {
  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;

    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedImage = sortedImages[selectedIndex];

  if (sortedImages.length === 0) {
    return (
      <div
        style={{ background: fallbackBackground }}
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[28px] p-8"
      >
        <Image
          src={fallbackImage}
          alt={productName}
          fill
          unoptimized
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* MAIN IMAGE */}
      <div
        style={{
          background: fallbackBackground,
        }}
        className="relative aspect-square overflow-hidden rounded-[28px]"
      >
        <Image
          src={selectedImage.image_url}
          alt={selectedImage.alt_text || productName}
          fill
          unoptimized
          className="object-contain p-8 transition-opacity duration-200"
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {sortedImages.length > 1 && (
          <div className="absolute bottom-4 right-4 rounded-full bg-black/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white">
            {selectedIndex + 1} / {sortedImages.length}
          </div>
        )}
      </div>

      {/* THUMBNAILS */}
      {sortedImages.length > 1 && (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {sortedImages.map((image, index) => {
            const isSelected =
              index === selectedIndex;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() =>
                  setSelectedIndex(index)
                }
                aria-label={`View image ${
                  index + 1
                } of ${sortedImages.length}`}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-white transition ${
                  isSelected
                    ? "border-black"
                    : "border-black/10 hover:border-black/30"
                }`}
              >
                <Image
                  src={image.image_url}
                  alt={
                    image.alt_text ||
                    `${productName} image ${
                      index + 1
                    }`
                  }
                  width={100}
                  height={100}
                  sizes="100px"
                />

                {image.is_primary && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-black px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                    Main
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
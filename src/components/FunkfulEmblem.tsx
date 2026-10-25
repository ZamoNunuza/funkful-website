import Image from "next/image";
import { FUNKFUL_EMBLEM } from "@/lib/brands";

/**
 * The Funkful emblem for compact spaces (avatars, tiles, admin chrome, footer
 * marks). For website headers, packaging and other branding use the wide
 * funkful-logo instead.
 */
export default function FunkfulEmblem({
  size = 32,
  alt = "Funkful",
  className = "",
  priority = false,
}: {
  size?: number;
  /** Pass "" when the emblem is purely decorative. */
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={FUNKFUL_EMBLEM}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      draggable={false}
      className={`object-contain ${className}`}
    />
  );
}

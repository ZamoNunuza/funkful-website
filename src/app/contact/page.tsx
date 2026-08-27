import Link from 'next/link';
import ContactSection from '@/components/ContactSection/ContactSection';

export default function ContactPage() {
  return (
    <>
      <div className="max-w-[1180px] mx-auto px-8 pt-4 text-xs text-neutral-500">
        <Link href="/">Home</Link> / <span className="text-black font-medium">Contact</span>
      </div>
      <ContactSection />
    </>
  );
}
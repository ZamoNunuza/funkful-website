import Link from 'next/link';
import ContactSection from '@/components/ContactSection/ContactSection';

export default function ContactPage() {
  return (
    <>
      <div className="wrap crumbs">
        <Link href="/">Home</Link> / <span>Contact</span>
      </div>
      <ContactSection />
    </>
  );
}
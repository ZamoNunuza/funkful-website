import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Funkful",
  description:
    "Funkful's Privacy Policy explains how we collect, use, protect and process personal information in accordance with POPIA.",
  robots: {
    index: true,
    follow: true,
  },
};

const sections = [
  {
    id: "who-we-are",
    title: "1. Who we are",
    content: (
      <>
        <p>
          The website and services are operated by <strong>Funkful</strong>.
        </p>

        <p>
          Legal entity / trading details:{" "}
          <strong>Funkful PTY ltd</strong>
        </p>

        <p>
          Website:{" "}
          <strong>https://www.funkful.co.za</strong>
        </p>

        <p>
          Privacy contact:{" "}
          <strong>privacy@funkful.com</strong>
        </p>

        <p>
          For purposes of the Protection of Personal Information Act 4 of 2013
          (&quot;POPIA&quot;), Funkful acts as the responsible party in relation to
          personal information that we process for our own business purposes.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "2. What personal information we collect",
    content: (
      <>
        <p>
          Depending on how you interact with Funkful, we may collect and
          process the following categories of personal information:
        </p>

        <h3 className="subheader">2.1 Account information</h3>
        <p>When you create an account, we may collect:</p>
        <ul>
          <li>First name</li>
          <li>Last name</li>
          <li>Email address</li>
          <li>Authentication and account information</li>
          <li>Password-related information handled by our authentication provider</li>
        </ul>

        <p>
          Your password is not stored by Funkful in plain text.
        </p>

        <h3 className="subheader">2.2 Order and customer information</h3>
        <p>When you place an order, we may collect:</p>
        <ul>
          <li>Name and surname</li>
          <li>Email address</li>
          <li>Telephone or mobile number</li>
          <li>Delivery address</li>
          <li>Billing information</li>
          <li>Order details</li>
          <li>Products purchased</li>
          <li>Personalisation instructions</li>
          <li>Customer comments or notes</li>
          <li>Order number and order status</li>
          <li>Transaction-related information</li>
        </ul>

        <h3 className="subheader">2.3 Payment information</h3>
        <p>
          Payments may be processed through third-party payment providers.
          Depending on the payment method selected, payment information may be
          processed directly by the relevant payment provider.
        </p>

        <p>
          Funkful does not need to store your full card number, CVV or other
          sensitive card authentication information on our own systems.
        </p>

        <h3 className="subheader">2.4 Communications</h3>
        <p>When you contact us, we may collect:</p>
        <ul>
          <li>Your name</li>
          <li>Email address</li>
          <li>Telephone or WhatsApp number</li>
          <li>The contents of your message</li>
          <li>Other information you voluntarily provide</li>
        </ul>

        <h3 className="subheader">2.5 Newsletter and marketing information</h3>
        <p>
          If you subscribe to Funkful marketing communications, we may collect:
        </p>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Brand or product interests</li>
          <li>Subscription status</li>
          <li>Marketing preferences</li>
          <li>Email delivery and interaction information, where supported</li>
        </ul>

        <h3 className="subheader">2.6 Website and technical information</h3>
        <p>
          When you use our website, certain technical information may be
          collected automatically, including:
        </p>
        <ul>
          <li>IP address</li>
          <li>Browser type</li>
          <li>Device type</li>
          <li>Operating system</li>
          <li>Pages visited</li>
          <li>Referring website</li>
          <li>Date and time of visits</li>
          <li>Website interaction information</li>
          <li>Security and diagnostic information</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-collect",
    title: "3. How we collect personal information",
    content: (
      <>
        <p>We may collect personal information:</p>
        <ul>
          <li>Directly from you when you create an account;</li>
          <li>When you place an order;</li>
          <li>When you complete forms on our website;</li>
          <li>When you subscribe to our newsletter;</li>
          <li>When you contact us;</li>
          <li>When you communicate with us through WhatsApp, email or other channels;</li>
          <li>When you submit a review;</li>
          <li>Automatically through your use of our website;</li>
          <li>From payment, delivery and other service providers where necessary to fulfil your order; and</li>
          <li>From other sources where permitted by applicable law.</li>
        </ul>

        <p>
          We generally collect personal information directly from you. Where
          we obtain information from another source, we will do so only where
          permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "why-we-use",
    title: "4. Why we use your personal information",
    content: (
      <>
        <h3 className="subheader">4.1 Providing our services</h3>
        <p>We use personal information to:</p>
        <ul>
          <li>Create and manage customer accounts;</li>
          <li>Process and fulfil orders;</li>
          <li>Create personalised products;</li>
          <li>Process payments;</li>
          <li>Arrange delivery;</li>
          <li>Provide customer support;</li>
          <li>Communicate with you about your orders;</li>
          <li>Manage returns, refunds and complaints; and</li>
          <li>Provide other services you request.</li>
        </ul>

        <h3 className="subheader">4.2 Website operation</h3>
        <p>We may process information to:</p>
        <ul>
          <li>Operate and maintain our website;</li>
          <li>Keep customer accounts functioning;</li>
          <li>Maintain shopping-cart and checkout functionality;</li>
          <li>Prevent fraud and abuse;</li>
          <li>Protect the security of our website and systems;</li>
          <li>Diagnose technical problems; and</li>
          <li>Improve website functionality.</li>
        </ul>

        <h3 className="subheader">4.3 Communications</h3>
        <p>We may use your information to send:</p>
        <ul>
          <li>Order confirmations;</li>
          <li>Payment confirmations;</li>
          <li>Delivery updates;</li>
          <li>Account-related messages;</li>
          <li>Password-reset and security communications;</li>
          <li>Customer-service responses; and</li>
          <li>Other communications necessary to provide our services.</li>
        </ul>

        <h3 className="subheader">4.4 Marketing</h3>
        <p>
          Where permitted by law and, where required, with your consent, we
          may use your contact information to send marketing communications
          about Funkful, Scoopful by Funkful, products, promotions, offers and
          related services.
        </p>

        <p>
          You can opt out of marketing communications at any time.
        </p>
      </>
    ),
  },
  {
    id: "lawful-basis",
    title: "5. Lawful basis for processing",
    content: (
      <>
        <p>
          Funkful processes personal information in accordance with the
          conditions for lawful processing under POPIA.
        </p>

        <p>Depending on the circumstances, processing may be based on:</p>

        <ul>
          <li>Your consent;</li>
          <li>The performance of a contract with you;</li>
          <li>Taking steps at your request before entering into a contract;</li>
          <li>Compliance with a legal obligation;</li>
          <li>Protecting your legitimate interests or those of another person; or</li>
          <li>
            A legitimate interest recognised under applicable law, where
            permitted.
          </li>
        </ul>

        <p>
          Where consent is the basis for processing, you may withdraw your
          consent, subject to any legal or contractual consequences of doing
          so.
        </p>

        <p>
          Withdrawal of consent does not affect the lawfulness of processing
          that took place before withdrawal.
        </p>
      </>
    ),
  },
  {
    id: "personalised-products",
    title: "6. Personalised products",
    content: (
      <>
        <p>
          Funkful may process information that you provide when requesting
          personalised products.
        </p>

        <p>
          This may include names, messages, images, artwork, photographs or
          other content supplied by you.
        </p>

        <p>
          You are responsible for ensuring that you have the necessary rights
          or permission to provide content that you upload or submit to us.
        </p>

        <p>
          We use such information only as reasonably necessary to fulfil your
          order, provide customer support, communicate with you, or otherwise
          provide the service you requested.
        </p>

        <p>
          We will not use customer-submitted personalisation content for
          unrelated purposes without an appropriate lawful basis.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "7. Who we may share personal information with",
    content: (
      <>
        <p>
          We may share personal information with trusted third parties where
          reasonably necessary to operate our business and provide our services.
        </p>

        <p>These may include:</p>

        <ul>
          <li>Payment processors;</li>
          <li>Delivery and courier providers;</li>
          <li>Website hosting and infrastructure providers;</li>
          <li>Database and authentication providers;</li>
          <li>Email delivery providers;</li>
          <li>Customer communication providers;</li>
          <li>Website analytics and security providers;</li>
          <li>Technology and software service providers;</li>
          <li>Professional advisers;</li>
          <li>
            Regulators, law-enforcement authorities or other public bodies
            where legally required; and
          </li>
          <li>
            Other service providers where necessary to provide a service you
            have requested.
          </li>
        </ul>

        <p>
          We do not sell your personal information to third parties.
        </p>

        <p>
          Third-party service providers may process information on our behalf
          and may have their own privacy policies and terms.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "8. Third-party service providers",
    content: (
      <>
        <p>
          Funkful may use third-party technology providers to operate parts of
          the website and business.
        </p>

        <p>These may include services used for:</p>

        <ul>
          <li>Website hosting;</li>
          <li>Database storage;</li>
          <li>Authentication;</li>
          <li>Email delivery;</li>
          <li>Payment processing;</li>
          <li>Order fulfilment;</li>
          <li>Security;</li>
          <li>Analytics; and</li>
          <li>Customer communications.</li>
        </ul>

        <p>
          Examples may include Supabase, Resend, Yoco, hosting providers and
          other service providers integrated into the Funkful website.
        </p>

        <p>
          The specific providers used by Funkful may change over time as our
          website and services develop.
        </p>

        <p>
          Where a third party processes personal information on our behalf, we
          take reasonable steps to ensure that appropriate privacy and security
          obligations apply.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "9. International processing and transfers",
    content: (
      <>
        <p>
          Some of our service providers may process or store personal
          information outside South Africa.
        </p>

        <p>
          Where personal information is transferred outside South Africa,
          Funkful will take reasonable steps to ensure that the transfer is
          made in accordance with POPIA and other applicable legal requirements.
        </p>

        <p>
          This may include ensuring that the recipient provides an adequate
          level of protection, that appropriate contractual safeguards are in
          place, or that another lawful basis for the transfer applies.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "10. Information security",
    content: (
      <>
        <p>
          Funkful takes reasonable technical and organisational measures to
          protect personal information against:
        </p>

        <ul>
          <li>Loss;</li>
          <li>Damage;</li>
          <li>Unauthorised access;</li>
          <li>Unauthorised disclosure;</li>
          <li>Unauthorised alteration;</li>
          <li>Unlawful processing; and</li>
          <li>Other forms of misuse.</li>
        </ul>

        <p>
          Security measures may include access controls, authentication
          controls, secure connections, service-provider security controls and
          other appropriate safeguards.
        </p>

        <p>
          However, no internet transmission or electronic storage system can be
          guaranteed to be completely secure.
        </p>

        <p>
          If we become aware of a security compromise affecting personal
          information, we will respond in accordance with applicable legal
          requirements, including POPIA.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "11. How long we keep personal information",
    content: (
      <>
        <p>
          We retain personal information only for as long as reasonably
          necessary for the purpose for which it was collected, unless a
          longer retention period is required or permitted by law.
        </p>

        <p>
          Certain information relating to orders, payments, invoices,
          accounting, tax, customer communications and legal disputes may need
          to be retained for longer periods to comply with legal, regulatory,
          accounting or contractual obligations.
        </p>

        <p>
          When personal information is no longer required, we will take
          reasonable steps to securely delete, destroy or anonymise it.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "12. Your rights under POPIA",
    content: (
      <>
        <p>
          Subject to the conditions and limitations set out in POPIA, you have
          rights in relation to your personal information.
        </p>

        <p>These may include the right to:</p>

        <ul>
          <li>Ask whether we hold personal information about you;</li>
          <li>Request access to personal information we hold about you;</li>
          <li>
            Request correction or updating of inaccurate or incomplete
            information;
          </li>
          <li>
            Request deletion or destruction of personal information in
            circumstances permitted by law;
          </li>
          <li>Object to certain processing of your personal information;</li>
          <li>
            Object to the processing of your personal information for direct
            marketing;
          </li>
          <li>Withdraw consent where processing is based on consent;</li>
          <li>
            Request information about how your personal information is
            processed; and
          </li>
          <li>
            Lodge a complaint with the Information Regulator where you believe
            your rights have been infringed.
          </li>
        </ul>

        <p>
          These rights are subject to the requirements, exceptions and
          limitations contained in POPIA and other applicable laws.
        </p>
      </>
    ),
  },
  {
    id: "account-information",
    title: "13. Updating your account information",
    content: (
      <>
        <p>
          You should ensure that the personal information associated with your
          Funkful account is accurate and up to date.
        </p>

        <p>
          If your account does not provide a self-service option for changing
          certain information, including your registered email address, you may
          contact us for assistance.
        </p>

        <p>
          We may need to verify your identity before making changes to account
          information.
        </p>
      </>
    ),
  },
  {
    id: "account-deletion",
    title: "14. Account deletion",
    content: (
      <>
        <p>
          You may request the deletion of your Funkful account and associated
          personal information by contacting us.
        </p>

        <p>
          We may need to verify your identity before processing an
          account-deletion request.
        </p>

        <p>
          Account deletion does not necessarily mean that all information can
          immediately be erased. We may retain certain information where
          required or permitted by law, including information required for:
        </p>

        <ul>
          <li>Tax and accounting purposes;</li>
          <li>Legal compliance;</li>
          <li>Fraud prevention;</li>
          <li>Dispute resolution;</li>
          <li>Enforcement of agreements; or</li>
          <li>
            Establishing, exercising or defending legal claims.
          </li>
        </ul>

        <p>
          Where information must be retained, we will limit its use to the
          applicable lawful purpose.
        </p>
      </>
    ),
  },
  {
    id: "direct-marketing",
    title: "15. Direct marketing",
    content: (
      <>
        <p>
          Where required by POPIA, Funkful will obtain consent before sending
          direct electronic marketing communications.
        </p>

        <p>
          You may unsubscribe from marketing emails using the unsubscribe
          mechanism provided in the communication or by contacting us.
        </p>

        <p>
          Opting out of marketing does not prevent us from sending essential
          transactional or service-related communications.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "16. Cookies",
    content: (
      <>
        <p>
          Our website may use cookies and similar technologies.
        </p>

        <p>Cookies may be used to:</p>

        <ul>
          <li>Keep the website functioning;</li>
          <li>Remember certain preferences;</li>
          <li>Maintain shopping-cart functionality;</li>
          <li>Support account and authentication functionality;</li>
          <li>Improve website security;</li>
          <li>Understand website usage; and</li>
          <li>Improve our services.</li>
        </ul>

        <p>
          Where third-party analytics or similar technologies are used, those
          providers may process information in accordance with their own terms
          and privacy policies.
        </p>

        <p>
          You may be able to control or disable cookies through your browser
          settings. Disabling certain cookies may affect website functionality.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "17. Children's personal information",
    content: (
      <>
        <p>
          Funkful&apos;s services are not intended to encourage children to provide
          personal information without appropriate parental or guardian
          involvement.
        </p>

        <p>
          Where POPIA requires specific consent or authorisation for the
          processing of children&apos;s personal information, Funkful will comply
          with the applicable requirements.
        </p>

        <p>
          If you believe that a child has provided personal information to us
          in circumstances where it should not have been collected, please
          contact us.
        </p>
      </>
    ),
  },
  {
    id: "reviews",
    title: "18. Reviews and customer content",
    content: (
      <>
        <p>
          If you voluntarily submit a review, testimonial, photograph or other
          content to Funkful, we may process that information for the purpose
          for which it was submitted.
        </p>

        <p>
          Where we intend to publish customer content publicly, we will
          consider whether additional permission or consent is required,
          particularly where the content contains personal information.
        </p>

        <p>
          You should avoid submitting personal information belonging to another
          person unless you have the necessary permission or lawful basis to do
          so.
        </p>
      </>
    ),
  },
  {
    id: "third-party-links",
    title: "19. Links to other websites",
    content: (
      <>
        <p>
          Our website may contain links to third-party websites or services.
        </p>

        <p>
          Funkful is not responsible for the privacy practices, content or
          security of third-party websites.
        </p>

        <p>
          We recommend reviewing the privacy policy of any third-party website
          before providing personal information.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "20. Changes to this Privacy Policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time to reflect
          changes to:
        </p>

        <ul>
          <li>Our services;</li>
          <li>Our website;</li>
          <li>Technology we use;</li>
          <li>Legal or regulatory requirements; or</li>
          <li>Our privacy practices.</li>
        </ul>

        <p>
          The latest version will be published on this page with the applicable
          &quot;Last updated&quot; date.
        </p>

        <p>
          Where required by law, we will take additional steps to notify you of
          material changes.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "21. Complaints and contacting us",
    content: (
      <>
        <p>
          If you have questions about this Privacy Policy, want to exercise a
          privacy right, or wish to make a complaint regarding our processing
          of your personal information, please contact Funkful:
        </p>

        <div className="contactCard">
          <p>
            <strong>Privacy contact:</strong>{" "}
            <a href="mailto:hello@funkful.co.za">hello@funkful.co.za</a>
          </p>

          <p>
            <strong>General contact:</strong>{" "}
            <a href="mailto:info@funkful.co.za">info@funkful.co.za</a>
          </p>

          <p>
            <strong>Business address:</strong>{" "}
            8 Pembroke Street, Sydenham, Johannesburg, 2192, South Africa
          </p>
        </div>

        <p>
          We will consider and respond to privacy requests in accordance with
          applicable law.
        </p>

        <p>
          If you are not satisfied with our response, you may lodge a complaint
          with the Information Regulator of South Africa, subject to the
          applicable procedures.
        </p>
      </>
    ),
  },
  {
    id: "information-regulator",
    title: "22. Information Regulator",
    content: (
      <>
        <p>
          The Information Regulator is the independent regulator responsible
          for matters relating to POPIA and PAIA in South Africa.
        </p>

        <div className="contactCard">
          <p>
            <strong>Information Regulator</strong>
          </p>

          <p>
            Website:{" "}
            <a
              href="https://inforegulator.org.za/"
              target="_blank"
              rel="noopener noreferrer"
            >
              inforegulator.org.za
            </a>
          </p>

          <p>
            Email:{" "}
            <a href="mailto:enquiries@inforegulator.org.za">
              enquiries@inforegulator.org.za
            </a>
          </p>

          <p>
            Telephone: 010 023 5200
          </p>
        </div>
      </>
    ),
  },
  {
    id: "acceptance",
    title: "23. Acceptance of this Privacy Policy",
    content: (
      <>
        <p>
          By using the Funkful website, you acknowledge that you have had an
          opportunity to read this Privacy Policy.
        </p>

        <p>
          Where applicable law requires your consent for a particular
          processing activity, Funkful will obtain that consent in the manner
          required by law.
        </p>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-[1180px] px-6 py-16 md:px-8 md:py-20">
          <div className="max-w-3xl">
            <Link
              href="/"
              className="mb-6 inline-flex text-sm font-medium text-neutral-600 transition hover:text-black"
            >
              ← Back to Funkful
            </Link>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#D8741F]">
              Legal
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-neutral-950 md:text-5xl">
              Privacy Policy
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600 md:text-lg">
              Your privacy matters to us. This Privacy Policy explains how
              Funkful collects, uses, protects and processes your personal
              information.
            </p>

            <p className="mt-4 text-sm text-neutral-500">
              Last updated: 21 September 2026
            </p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section>
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 py-12 md:grid-cols-[240px_minmax(0,1fr)] md:px-8 md:py-16">
          {/* Table of contents */}
          <aside className="md:sticky md:top-24 md:self-start">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="mb-4 text-sm font-semibold text-neutral-950">
                On this page
              </p>

              <nav aria-label="Privacy Policy sections">
                <ol className="space-y-2">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="block text-sm leading-5 text-neutral-600 transition hover:text-[#D8741F]"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </aside>

          {/* Policy */}
          <article className="min-w-0 max-w-3xl">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm md:p-10">
              <div className="mb-10 rounded-xl border border-[#D8741F]/20 bg-[#D8741F]/5 p-5">
                <p className="text-sm leading-6 text-neutral-700">
                  Funkful respects your privacy and is committed to protecting
                  your personal information. We process personal information in
                  accordance with the{" "}
                  <strong>
                    Protection of Personal Information Act 4 of 2013
                    (&quot;POPIA&quot;)
                  </strong>{" "}
                  and other applicable South African laws.
                </p>
              </div>

              <div className="space-y-12">
                {sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24"
                  >
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                      {section.title}
                    </h2>

                    <div className="mt-5 space-y-4 text-[15px] leading-7 text-neutral-700">
                      {section.content}
                    </div>
                  </section>
                ))}
              </div>

              {/* Footer note */}
              <div className="mt-14 border-t border-neutral-200 pt-8">
                <p className="text-sm leading-6 text-neutral-500">
                  This Privacy Policy was last updated on{" "}
                  <strong>21 September 2026</strong>.
                </p>

                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <Link
                    href="/"
                    className="font-medium text-[#D8741F] hover:underline"
                  >
                    Return to Funkful
                  </Link>

                  <Link
                    href="/contact"
                    className="font-medium text-[#D8741F] hover:underline"
                  >
                    Contact us
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

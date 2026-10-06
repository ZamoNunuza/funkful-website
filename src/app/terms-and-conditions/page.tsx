import { palette } from "@/lib/brands";

export const metadata = {
  title: "Terms & Conditions | Funkful",
  description:
    "Funkful terms and conditions covering website use, orders, payments, made-to-order products, delivery, returns, refunds and custom products.",
};

export default function TermsAndConditionsPage() {
  return (
    <main
      style={{
        background: palette?.cream ?? "#fff",
        color: palette?.black ?? "#111",
      }}
    >
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 sm:px-8 lg:px-12">
        <div className="mb-12">
          <p
            className="text-sm font-bold uppercase tracking-[0.2em]"
            style={{ color: palette?.orange ?? "#D8741F" }}
          >
            Legal
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Terms &amp; Conditions
          </h1>

          <p className="mt-5 text-base leading-7 text-black/60">
            Last updated: 6 October 2026
          </p>
        </div>

        <div className="space-y-12 text-base leading-8 text-black/70">
          <Section title="1. Introduction">
            <p>
              These Terms and Conditions govern your use of the Funkful
              website and your purchase of products from Funkful.
            </p>

            <p>
              By using this website or placing an order, you agree to these
              Terms and Conditions. If you do not agree with them, please do
              not use the website or place an order.
            </p>

            <p>
              Funkful is a South African business offering personalized gifts,
              made-to-order products, custom products and related creative
              items. Funkful also operates{" "}
              <strong>Scoopful by Funkful</strong>, a mystery-scoop product
              range.
            </p>
          </Section>

          <Section title="2. Website Information">
            <p>
              We make reasonable efforts to ensure that product descriptions,
              photographs, prices and other information displayed on the
              website are accurate and up to date.
            </p>

            <p>
              Because many Funkful products are handmade, personalized or
              made to order, there may be minor variations in colour,
              placement, texture or finish between the product shown on the
              website and the final product received.
            </p>

            <p>
              Product images may also appear differently depending on your
              device, screen and display settings.
            </p>
          </Section>

          <Section title="3. Products Made to Order">
            <p>
              Many Funkful products are made to order. This means production
              begins after an order has been placed and payment has been
              received or successfully authorized.
            </p>

            <p>
              Made-to-order products generally require{" "}
              <strong>3–5 business days</strong> for preparation before
              dispatch, unless a different timeframe is stated on the product
              page or communicated to you.
            </p>

            <p>
              Production times may be affected by the complexity of a custom
              request, supplier availability, unusually large orders or busy
              seasonal periods.
            </p>
          </Section>

          <Section title="4. Personalized and Custom Products">
            <p>
              You are responsible for checking names, spelling, dates, wording
              and other information supplied for personalization before
              submitting your order.
            </p>

            <p>
              Where a product is created according to information supplied by
              you, Funkful will use that information to prepare the product.
            </p>

            <p>
              A customer may not be entitled to cancel or return a product
              simply because they changed their mind after production has
              started, particularly where the product has been personalized
              or made according to the customer&apos;s specifications, subject
              always to any rights available under applicable law.
            </p>

            <p>
              If Funkful makes an error in personalization or produces an item
              that does not materially conform to the order, please contact us
              so that we can investigate and resolve the issue.
            </p>
          </Section>

          <Section title="5. Custom Artwork and Designs">
            <p>
              If you provide artwork, photographs, logos, text or other
              materials for a custom order, you confirm that you have the
              necessary rights or permission to provide and use those
              materials for the requested purpose.
            </p>

            <p>
              You are responsible for ensuring that materials supplied to
              Funkful do not unlawfully infringe another person&apos;s
              intellectual property, privacy or other rights.
            </p>

            <p>
              Funkful may refuse a custom request where we reasonably believe
              that the request would involve unlawful, infringing or
              inappropriate content.
            </p>
          </Section>

          <Section title="6. Prices and Payment">
            <p>
              All prices displayed on the website are in South African Rand
              (ZAR), unless otherwise stated.
            </p>

            <p>
              The applicable price is the price displayed at the time the
              order is placed, subject to obvious pricing errors.
            </p>

            <p>
              An order is only considered confirmed once payment has been
              successfully received or authorized through the available
              payment method.
            </p>

            <p>
              Funkful may use third-party payment providers to process
              payments. Payment information is handled through the applicable
              payment provider&apos;s systems and policies.
            </p>
          </Section>

          <Section title="7. Order Acceptance and Cancellation">
            <p>
              Placing an order constitutes a request to purchase the selected
              products. Funkful reserves the right to decline or cancel an
              order where there is a legitimate reason, including stock or
              supplier issues, suspected payment problems, obvious pricing
              errors or circumstances beyond our reasonable control.
            </p>

            <p>
              If Funkful cancels an order after payment has been received, any
              refund due will be processed in accordance with our refund
              process and applicable law.
            </p>

            <p>
              If you wish to cancel an order, please contact us as soon as
              possible. Cancellation of made-to-order or personalized products
              may not be possible once production has started.
            </p>
          </Section>

          <Section title="8. Delivery">
            <p>
              Made-to-order products are generally prepared within{" "}
              <strong>3–5 business days</strong> before dispatch.
            </p>

            <p>
              Once dispatched, delivery generally takes approximately{" "}
              <strong>2–5 business days</strong>, depending on the delivery
              address and courier service.
            </p>

            <p>
              Delivery estimates are not guarantees. Delays may occur because
              of courier disruptions, incorrect delivery information, public
              holidays, weather, peak periods or other circumstances outside
              Funkful&apos;s reasonable control.
            </p>

            <p>
              Customers are responsible for providing accurate delivery
              information. Additional delivery charges may apply where an
              incorrect or incomplete address results in a failed delivery or
              re-delivery.
            </p>
          </Section>

          <Section title="9. Damaged or Incorrect Orders">
            <p>
              Please contact Funkful within <strong>7 days</strong> of
              receiving your order if your item arrives damaged, faulty or
              materially different from what you ordered.
            </p>

            <p>
              Please provide your order details together with clear photographs
              of the product and, where applicable, the packaging.
            </p>

            <p>
              We will assess the issue and, where appropriate, arrange a
              replacement, repair or refund in accordance with the
              circumstances and applicable consumer law.
            </p>

            <p>
              This process does not limit any consumer rights that cannot
              lawfully be excluded.
            </p>
          </Section>

          <Section title="10. Returns and Refunds">
            <p>
              Funkful aims to handle returns and refunds fairly and in
              accordance with applicable South African consumer protection
              legislation.
            </p>

            <p>
              Certain statutory rights may apply to defective, unsafe,
              unsuitable or incorrectly supplied goods. Personalized or
              made-to-order products may be subject to different return
              considerations where permitted by law.
            </p>

            <p>
              Where a refund has been approved, Funkful will generally process
              the refund within <strong>3–5 business days</strong>. Your bank
              or payment provider may require additional time to reflect the
              refund.
            </p>

            <p>
              For full details of the process, please refer to our Returns &
              Refunds information.
            </p>
          </Section>

          <Section title="11. Scoopful by Funkful">
            <p>
              Scoopful by Funkful offers mystery products where the specific
              item or combination of items may not be known before the scoop
              is opened.
            </p>

            <p>
              By purchasing a mystery scoop, you acknowledge the nature of the
              product and understand that receiving a particular item, design,
              colour or variation cannot necessarily be guaranteed unless
              specifically stated in the product description.
            </p>

            <p>
              This does not affect any rights you may have where a product is
              defective, incorrectly supplied or otherwise does not meet
              applicable consumer requirements.
            </p>
          </Section>

          <Section title="12. Intellectual Property">
            <p>
              Unless otherwise stated, the Funkful name, logos, branding,
              website design, original graphics, written content, photographs,
              product descriptions and other original website materials belong
              to Funkful or are used with permission.
            </p>

            <p>
              You may not copy, reproduce, distribute, modify or commercially
              exploit Funkful&apos;s original content without prior written
              permission.
            </p>

            <p>
              Third-party names, characters, brands, logos or other
              intellectual property remain the property of their respective
              owners. Their appearance in product designs does not imply
              ownership by Funkful unless expressly stated.
            </p>
          </Section>

          <Section title="13. Website Use">
            <p>
              You agree to use the website lawfully and not to interfere with
              its operation, attempt unauthorized access, introduce malicious
              code or use the website for fraudulent purposes.
            </p>

            <p>
              Funkful may temporarily suspend or restrict access to parts of
              the website where necessary for maintenance, security, updates
              or circumstances outside our reasonable control.
            </p>
          </Section>

          <Section title="14. Third-Party Services">
            <p>
              Funkful may use third-party providers for services such as
              payment processing, delivery, email communication, hosting and
              other website functionality.
            </p>

            <p>
              Those providers may have their own terms, conditions and privacy
              policies. Where relevant, your use of their services may also be
              subject to those terms.
            </p>
          </Section>

          <Section title="15. Limitation of Liability">
            <p>
              Funkful will take reasonable steps to provide products and
              services as described on the website.
            </p>

            <p>
              Nothing in these Terms and Conditions is intended to exclude,
              restrict or limit any liability or consumer right where doing so
              would be unlawful under applicable South African law.
            </p>

            <p>
              Funkful will not be responsible for delays or failures caused by
              circumstances reasonably outside our control, including courier
              disruptions, supplier delays, network failures, power
              interruptions, natural events or other force majeure events.
            </p>
          </Section>

          <Section title="16. Privacy">
            <p>
              Information submitted when using the Funkful website or placing
              an order may be processed for purposes such as fulfilling orders,
              processing payments, providing customer support, arranging
              delivery and communicating with you.
            </p>

            <p>
              Please refer to our Privacy Policy for more information about
              how personal information is handled.
            </p>
          </Section>

          <Section title="17. Changes to These Terms">
            <p>
              Funkful may update these Terms and Conditions from time to time
              to reflect changes to our products, services, website or legal
              requirements.
            </p>

            <p>
              The latest version published on this page will apply to future
              use of the website and future orders.
            </p>
          </Section>

          <Section title="18. Governing Law">
            <p>
              These Terms and Conditions are governed by the laws of the
              Republic of South Africa, subject to any mandatory consumer
              rights and protections that apply.
            </p>
          </Section>

          <Section title="19. Contact Us">
            <p>
              If you have a question about these Terms and Conditions, an
              order, a product or a refund, please contact Funkful through the
              contact details provided on our website.
            </p>

            <p>
              We encourage customers to contact us first so that we can try to
              resolve any issue as quickly and fairly as possible.
            </p>
          </Section>

          <div
            className="rounded-2xl border p-6 text-sm leading-7"
            style={{
              borderColor: `${palette?.orange ?? "#D8741F"}40`,
              background: `${palette?.orange ?? "#D8741F"}08`,
            }}
          >
            <strong className="text-black">Important:</strong>{" "}
            These Terms and Conditions are intended as a practical website
            terms template for Funkful and should be reviewed by a South
            African legal professional before being treated as your final
            legally reviewed terms.
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-black tracking-tight text-black sm:text-3xl">
        {title}
      </h2>

      <div className="space-y-4">{children}</div>
    </section>
  );
}
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <Link href="/" className="text-sm text-orange-600 hover:underline">← Back to home</Link>
        <h1 className="text-3xl font-bold mt-4 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: 21 September 2026</p>

        <h2 className="text-xl font-semibold mt-8 mb-2">1. The service</h2>
        <p className="text-gray-700 leading-relaxed">
          QEVYRA provides digital tools for businesses, including a public website, a QR menu with
          online ordering, and live job tracking. These terms cover your use of the platform hosted
          at qevyra.app.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">2. Accounts</h2>
        <p className="text-gray-700 leading-relaxed">
          You are responsible for keeping your login credentials confidential and for all activity
          under your account. You must provide accurate business information.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">3. Your content</h2>
        <p className="text-gray-700 leading-relaxed">
          You retain ownership of the content you publish (menus, pictures, descriptions). You agree
          that your content does not violate any law or the rights of others.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">4. Payments and plans</h2>
        <p className="text-gray-700 leading-relaxed">
          Plans are billed as described on the pricing page. Refunds and discontinuations follow the
          plan terms communicated when you subscribe.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">5. Availability</h2>
        <p className="text-gray-700 leading-relaxed">
          We work hard to keep the platform reliable, but we do not guarantee uninterrupted
          availability. We may update, suspend, or close parts of the service with reasonable notice
          where practical.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">6. Limitation of liability</h2>
        <p className="text-gray-700 leading-relaxed">
          To the maximum extent permitted by law, QEVYRA is not liable for indirect or consequential
          losses arising from your use of the service, including lost revenue from orders or bookings
          that fail.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">7. Changes to these terms</h2>
        <p className="text-gray-700 leading-relaxed">
          We may update these terms from time to time. Material changes will be communicated through
          the platform or by email.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">8. Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          Questions about these terms? Reach us via the <Link href="/contact" className="text-orange-600 hover:underline">contact page</Link>.
        </p>
      </div>
    </div>
  );
}
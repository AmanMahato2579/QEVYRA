import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <Link href="/" className="text-sm text-orange-600 hover:underline">← Back to home</Link>
        <h1 className="text-3xl font-bold mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: 21 September 2026</p>

        <h2 className="text-xl font-semibold mt-8 mb-2">1. What we collect</h2>
        <p className="text-gray-700 leading-relaxed">
          We collect the information a business provides to set up its account and improve its
          services: contact details, business profile, menu items, images, and settings. We also
          collect basic technical data (such as request times) to keep the platform secure and
          reliable.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">2. Customer data</h2>
        <p className="text-gray-700 leading-relaxed">
          Customers who scan a QR menu provide only what they choose: optional name when starting a
          session, items ordered, and (for bookings) their name and phone. This data is used solely
          to operate their dining or booking experience and is shown to the staff of the business
          they are visiting.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">3. Cookies and devices</h2>
        <p className="text-gray-700 leading-relaxed">
          A browser cookie is used to keep you signed in to the admin area. Hashing-protected, it
          stores no personal profile.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">4. How we protect data</h2>
        <p className="text-gray-700 leading-relaxed">
          Passwords are stored as strong, salted hashes and never in plain text. Order history is
          automatically removed after a short retention window. Access to the admin area requires
          authentication.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">5. Sharing</h2>
        <p className="text-gray-700 leading-relaxed">
          We do not sell personal data. We share data only with processors that run the platform for
          us (for example hosting and push notifications) or when the law requires it.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">6. Your rights</h2>
        <p className="text-gray-700 leading-relaxed">
          Business owners may request a copy of, or deletion of, the account data we hold by writing
          to us. Customer booking data may be deleted by asking the business you visited to remove
          it.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">7. Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          Privacy questions or requests can be sent via our <Link href="/contact" className="text-orange-600 hover:underline">contact page</Link>.
        </p>
      </div>
    </div>
  );
}
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/packages";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <Link href="/" className="text-sm text-orange-600 hover:underline">← Back to home</Link>
        <h1 className="text-3xl font-bold mt-4 mb-6">Contact QEVYRA</h1>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <p className="text-gray-700">
            We are happy to help with questions about plans, setup, billing, or anything else.
          </p>

          <a href={`mailto:${CONTACT_EMAIL}`} className="block text-orange-600 font-semibold hover:underline">
            {CONTACT_EMAIL}
          </a>

          <p className="text-sm text-gray-500">
            If your message is about a technical problem, include your business name and a short
            description of what happened so we can fix it faster.
          </p>
        </div>
      </div>
    </div>
  );
}
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QrCode, Utensils, Truck, Globe, Check } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">QEVYRA</span>
          </div>
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-2 text-sm text-orange-400 mb-6">
          One platform. Website · Order · Tracking
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent leading-tight">
          Everything your business needs in one place
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          QEVYRA gives your customers a public website, a QR menu with online ordering, and
          live job tracking — all from one dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8">
              Get Started
            </Button>
          </Link>
          <a href="#products">
            <Button size="lg" variant="outline" className="text-white border-white/20 px-8">
              Explore Products
            </Button>
          </a>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Our Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Globe,
              title: "QEVYRA Website",
              desc: "A professional public business website with customizable themes, sections, contact info and your own domain path.",
            },
            {
              icon: Utensils,
              title: "QEVYRA Order",
              desc: "QR menu for restaurants — customers scan, browse and order instantly. Kitchen dashboard, order status and billing included.",
            },
            {
              icon: Truck,
              title: "QEVYRA Track",
              desc: "Live service tracking for laundries, tailors, garages and repair shops. Customers follow their job status step by step.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-gray-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            {
              step: "1",
              title: "Your business, live",
              desc: "We set up your public website at your business name.",
            },
            {
              step: "2",
              title: "Customers connect",
              desc: "They visit your site, scan your QR menu, or track their service.",
            },
            {
              step: "3",
              title: "You manage one dashboard",
              desc: "Menus, orders, tickets and settings — all in one admin.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step}>
              <div className="w-12 h-12 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing / CTA */}
      <section id="pricing" className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              name: "Bronze",
              price: "Starter",
              points: ["Public business website", "QR menu (view only)"],
            },
            {
              name: "Silver",
              price: "Most popular",
              points: ["Everything in Bronze", "QR ordering & order management"],
            },
            {
              name: "Star",
              price: "Founders",
              points: ["Everything in Silver", "All current & future features"],
            },
          ].map(({ name, price, points }) => (
            <div key={name} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
              <h3 className="font-semibold text-lg mb-1 uppercase tracking-wide">{name}</h3>
              <p className="text-sm text-orange-400 mb-4">{price}</p>
              <ul className="space-y-2 mb-6">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Get in touch</h2>
        <p className="text-gray-400 mb-8">Questions about plans, setup or custom needs? We are here to help.</p>
        <a href="mailto:contact@qevyra.com">
          <Button size="lg" variant="outline" className="text-white border-white/20">
            contact@qevyra.com
          </Button>
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 py-8 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} QEVYRA · All rights reserved
      </footer>
    </div>
  );
}
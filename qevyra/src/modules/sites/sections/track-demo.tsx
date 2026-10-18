"use client";

import { useState } from "react";
import { Search, CheckCircle2, Clock, Truck, ShieldAlert } from "lucide-react";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function TrackDemoSection({ site }: { site: SiteData }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  const steps = [
    { title: "Order / Job Received", status: "completed", time: "10:30 AM" },
    { title: "In Progress / Servicing", status: "current", time: "In Progress" },
    { title: "Quality Check & Packing", status: "pending", time: "Pending" },
    { title: "Ready for Pickup / Delivery", status: "pending", time: "Pending" },
  ];

  return (
    <SectionContainer className="py-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm max-w-xl md:max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck
              className="w-5 h-5"
              style={{ color: "var(--site-primary, #2563eb)" }}
            />
            <h2 className="text-base font-bold text-gray-900">Track Your Order</h2>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <ShieldAlert className="w-3 h-3" />
            <span>Demo Mode</span>
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-5 leading-relaxed max-w-prose">
          Enter your registered mobile number below to track the live progress of
          your order or service ticket with {site.name}.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 mb-6">
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="Enter mobile number (e.g. 98XXXXXXXX)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-white font-semibold text-xs shadow-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: "var(--site-primary, #2563eb)" }}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track</span>
          </button>
        </form>

        {searched && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Found active demo order for {phoneInput || "entered number"}.</span>
          </div>
        )}

        {/* Demo Progress Card */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-100 mb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Sample Order #DEMO-7842
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Customer: {phoneInput || "9800000000"}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                Price: not updated yet
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 relative">
                {idx !== steps.length - 1 && (
                  <div
                    className={`absolute left-3 top-6 bottom-0 w-0.5 ${
                      step.status === "completed" ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  />
                )}
                <div className="shrink-0 mt-0.5 z-10 bg-white rounded-full">
                  {step.status === "completed" ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                  ) : step.status === "current" ? (
                    <Clock
                      className="w-6 h-6 animate-pulse"
                      style={{ color: "var(--site-primary, #2563eb)" }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-semibold ${
                      step.status === "current"
                        ? "text-blue-900"
                        : step.status === "completed"
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-[11px] text-gray-500">{step.time}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-center text-gray-500 mt-5 pt-3 border-t border-blue-100">
            This is a preview demonstration of live order tracking.
          </p>
        </div>
      </div>
    </SectionContainer>
  );
}

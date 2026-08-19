import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { OFFICIAL_CONTACT_INFO, OFFICIAL_SOCIAL_LINKS } from "../constants/contactConfig";
import { saveRecordToSupabase } from "../database/supabase";

export const ContactUs: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    const result = await saveRecordToSupabase("contact_inquiries", {
      id: `contact-${Date.now()}`,
      ...form,
      status: "Open",
      createdAt: new Date().toISOString(),
    });
    setSubmitting(false);
    if (!result.success) {
      setSubmitError("Your message could not be sent. Please try again.");
      return;
    }
    setSubmitted(true);
    setForm({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <section id="contact" className="scroll-mt-24">
      <div className="flex flex-col lg:flex-row items-stretch gap-6 md:gap-8 w-full">
        <div className="lg:w-1/3 bg-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden shadow-xl border border-slate-800">
          <div className="space-y-6 relative z-10">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight font-display">Contact Us</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Have questions about listing your conference, partnership opportunities, or organizer verification? Reach out to our global team.
            </p>
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Email</p>
                  <p className="text-xs font-semibold text-white">{OFFICIAL_CONTACT_INFO.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Phone</p>
                  <p className="text-xs font-semibold text-white">{OFFICIAL_CONTACT_INFO.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Address</p>
                  <p className="text-xs font-semibold text-white">{OFFICIAL_CONTACT_INFO.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
          {submitted ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Message Sent!</h3>
              <p className="text-xs text-slate-500 max-w-md">Thank you for reaching out. Our support team will respond within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Name"
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    maxLength={254}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Inquiry Subject"
                  maxLength={180}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="How can we help you?"
                  maxLength={4000}
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? "Sending…" : "Send Message"}</span>
              </button>
              {submitError && <p className="text-xs font-semibold text-red-600" role="alert">{submitError}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ContactUs;

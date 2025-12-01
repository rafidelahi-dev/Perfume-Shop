"use client";

import { useState } from "react";

export default function HelpCenterPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    email: "",
    category: "issue",
    subject: "",
    message: "",
  });

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/help", {
      method: "POST",
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) setSent(true);
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <h1 className="text-2xl font-semibold mb-4">Thank you!</h1>
        <p className="text-gray-600">
          Your message has been received. Our support team will get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-20 px-4">
      <h1 className="text-3xl font-semibold mb-6">Help Center</h1>
      <p className="text-gray-600 mb-8">
        Have feedback? Found an issue? Want to suggest a feature?
        We’re here to help.
      </p>

      <form onSubmit={submitForm} className="space-y-6">

        <input
          type="email"
          placeholder="Your email"
          className="w-full border px-4 py-3 rounded-lg"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <select
          className="w-full border px-4 py-3 rounded-lg"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          <option value="issue">Report an Issue</option>
          <option value="feedback">Send Feedback</option>
          <option value="suggestion">Suggest a Feature</option>
          <option value="other">Other</option>
        </select>

        <input
          type="text"
          placeholder="Subject"
          className="w-full border px-4 py-3 rounded-lg"
          required
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />

        <textarea
          placeholder="Your message"
          rows={6}
          className="w-full border px-4 py-3 rounded-lg"
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />

        <button
          disabled={loading}
          className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}

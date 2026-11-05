import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusPageConfigSchema } from "@pingboard/shared";
import { Globe, ExternalLink, Save, Building, Mail } from "lucide-react";

export const Settings: React.FC = () => {
  const [slug, setSlug] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const settings = await api.getStatusPageSettings();
        if (settings) {
          setSlug(settings.slug);
          setCompanyName(settings.companyName);
          setSupportEmail(settings.supportEmail || "");
          setIsPublic(settings.isPublic);
        } else {
          // Defaults
          setSlug("my-company");
          setCompanyName("My Company");
        }
      } catch (err: any) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const parse = StatusPageConfigSchema.safeParse({
      slug,
      companyName,
      supportEmail,
      isPublic,
    });

    if (!parse.success) {
      setMessage({ type: "error", text: parse.error.errors[0]?.message || "Validation failed" });
      return;
    }

    try {
      setSaving(true);
      await api.updateStatusPageSettings(parse.data);
      setMessage({ type: "success", text: "Status page settings updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update settings" });
    } finally {
      setSaving(false);
    }
  };

  const statusPageUrl = `${window.location.origin}/status/${slug}`;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Public Status Page Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your branded public status page accessible to your customers and users
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg text-sm border ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Company Name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Building className="h-4 w-4 text-slate-400" />
              Company / Product Name
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Status Page URL Slug */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Globe className="h-4 w-4 text-slate-400" />
              Status Page URL Slug
            </label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <span className="bg-slate-50 text-slate-500 px-3 py-2 text-xs font-mono border-r border-slate-300 flex items-center">
                /status/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="acme-corp"
                className="w-full px-3 py-2 text-sm outline-none font-mono"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Only lowercase alphanumeric characters and hyphens allowed.
            </p>
          </div>

          {/* Support Email */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Mail className="h-4 w-4 text-slate-400" />
              Support Contact Email (Optional)
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <div className="text-sm font-semibold text-slate-800">Public Visibility</div>
              <div className="text-xs text-slate-500">
                Allow anyone with the link to view your live system status without logging in.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Live URL Link preview */}
          {slug && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs text-blue-600 font-semibold block">Live Status Page URL</span>
                <span className="text-xs text-blue-900 font-mono">{statusPageUrl}</span>
              </div>
              <Link
                to={`/status/${slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Preview Page
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-sm transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

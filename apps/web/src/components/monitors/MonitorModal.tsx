import React, { useState } from "react";
import { Monitor, CreateMonitorInput, HttpMethod, CheckInterval } from "@pingboard/shared";
import { CreateMonitorSchema } from "@pingboard/shared";
import { X, Globe, Clock, ShieldCheck, Tag } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateMonitorInput) => Promise<void>;
  initialData?: Monitor | null;
}

export const MonitorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || "");
  const [url, setUrl] = useState(initialData?.url || "");
  const [httpMethod, setHttpMethod] = useState<HttpMethod>(initialData?.httpMethod || "GET");
  const [checkInterval, setCheckInterval] = useState<CheckInterval>(initialData?.checkInterval || 1);
  const [expectedStatusCode, setExpectedStatusCode] = useState<number>(
    initialData?.expectedStatusCode || 200
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parseResult = CreateMonitorSchema.safeParse({
      name,
      url,
      httpMethod,
      checkInterval,
      expectedStatusCode,
    });

    if (!parseResult.success) {
      setError(parseResult.error.errors[0]?.message || "Validation failed");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(parseResult.data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save monitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {initialData ? "Edit Monitor" : "Create New Monitor"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              Monitor Friendly Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production API Gateway"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
            />
          </div>

          {/* URL & Method */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Method</label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value as HttpMethod)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none bg-white"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                Target URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/health"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
              />
            </div>
          </div>

          {/* Check Interval & Expected Status Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Check Frequency
              </label>
              <select
                value={checkInterval}
                onChange={(e) => setCheckInterval(Number(e.target.value) as CheckInterval)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none bg-white"
              >
                <option value={1}>Every 1 minute</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                Expected Status Code
              </label>
              <input
                type="number"
                min={100}
                max={599}
                value={expectedStatusCode}
                onChange={(e) => setExpectedStatusCode(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting ? "Saving..." : initialData ? "Save Changes" : "Create Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

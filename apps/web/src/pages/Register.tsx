import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Activity, Lock, Mail, ArrowRight, KeyRound, CheckCircle2, RotateCcw, ArrowLeft } from "lucide-react";

export const Register: React.FC = () => {
  const [step, setStep] = useState<"REGISTER" | "VERIFY">("REGISTER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { signup, confirm, login, resendCode } = useAuth();
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    try {
      setLoading(true);
      const data = await signup(email, password);
      if (data?.userConfirmed) {
        await login(email, password);
        navigate("/");
      } else {
        setStep("VERIFY");
        setSuccessMessage(`A verification code was sent to ${email}. Please check your inbox.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    try {
      setLoading(true);
      await confirm(email, verificationCode.trim());
      setSuccessMessage("Email verified successfully! Logging you in...");

      // Automatically sign in the user
      try {
        await login(email, password);
        navigate("/");
      } catch {
        navigate("/login", { state: { message: "Account verified! Please sign in." } });
      }
    } catch (err: any) {
      setError(err.message || "Verification code is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    try {
      setResending(true);
      await resendCode(email);
      setSuccessMessage("A fresh verification code has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
          <Activity className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {step === "REGISTER" ? "Create your account" : "Verify your email"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {step === "REGISTER"
            ? "Get started with real-time uptime monitoring in minutes"
            : `Enter the verification code sent to ${email}`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === "REGISTER" ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Sign Up"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="mt-6 text-center text-xs text-slate-500">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                  Sign In
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Verification Code</label>
                <div className="relative">
                  <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full pl-9 pr-3 py-2 tracking-widest text-lg font-mono text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">Enter the 6-digit code received via email.</p>
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length < 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {resending ? "Resending..." : "Resend Code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("REGISTER");
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change Email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

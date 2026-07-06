import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const { login, loginWithSSO, zohoSession, zohoHasAccount, ALLOWED_DOMAIN } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false); // force full form when user picks "different account"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasZohoSession = !!zohoSession;
  const showSSO = hasZohoSession && !showForm;

  /* ── Regular email + password login ── */
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = login(email, password);
      setLoading(false);
      if (result.ok) {
        navigate("/", { replace: true });
      } else {
        setError(result.error);
      }
    }, 300);
  };

  /* ── One-click SSO login (Zoho session) ── */
  const handleSSOLogin = () => {
    setError("");
    setLoading(true);
    setTimeout(() => {
      const result = loginWithSSO();
      setLoading(false);
      if (result.ok) {
        navigate("/", { replace: true });
      } else {
        setError(result.error);
      }
    }, 400);
  };

  /* ═══════════════════════════════════════
     SSO SCREEN — Zoho account detected
     ═══════════════════════════════════════ */
  if (showSSO) {
    const userInitials = zohoSession.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="w-full max-w-[380px]">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-[#1D1D1F] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
              Welcome back
            </h1>
            <p className="text-[14px] text-[#86868B] mt-1">
              Sign in to Designfolio
            </p>
          </div>

          {/* SSO Card */}
          <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-6">
            {/* Zoho detection badge */}
            <div className="bg-[#F0F5FF] border border-[#007AFF]/15 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2.5">
              <div className="w-5 h-5 bg-[#E8384F] rounded flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[8px] font-extrabold tracking-tight">Z</span>
              </div>
              <p className="text-[11px] text-[#007AFF] font-medium">
                Zoho account detected in this browser
              </p>
            </div>

            {/* User avatar & info */}
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-violet-500 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-violet-100">
                <span className="text-white text-[20px] font-bold">{userInitials}</span>
              </div>
              <p className="text-[16px] font-semibold text-[#1D1D1F]">
                {zohoSession.name}
              </p>
              <p className="text-[13px] text-[#86868B] mt-0.5">{zohoSession.email}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                <p className="text-[12px] text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* Continue / Create account */}
            {zohoHasAccount ? (
              <button
                onClick={handleSSOLogin}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all ${
                  loading
                    ? "bg-[#007AFF]/60 cursor-not-allowed"
                    : "bg-[#007AFF] hover:bg-[#0066D6] active:scale-[0.98]"
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Continue to Designfolio
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            ) : (
              <Link
                to={`/signup?email=${encodeURIComponent(zohoSession.email)}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] active:scale-[0.98] transition-all"
              >
                Create Designfolio Account
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            {/* Different account */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[#E5E5EA]" />
              <span className="text-[10px] text-[#AEAEB2] font-medium uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[#E5E5EA]" />
            </div>

            <button
              onClick={() => {
                setShowForm(true);
                setError("");
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#D1D1D6] text-[13px] font-semibold text-[#636366] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all"
            >
              Use a different account
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-[#AEAEB2] mt-5">
            Only <span className="font-medium text-[#636366]">@{ALLOWED_DOMAIN}</span> accounts are supported
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     REGULAR LOGIN FORM
     ═══════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#1D1D1F] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
            Welcome back
          </h1>
          <p className="text-[14px] text-[#86868B] mt-1">
            Sign in to Designfolio
          </p>
        </div>

        {/* Back to SSO */}
        {hasZohoSession && (
          <button
            onClick={() => {
              setShowForm(false);
              setError("");
            }}
            className="flex items-center gap-1.5 text-[12px] text-[#007AFF] font-medium mb-3 hover:underline transition-all"
          >
            <ArrowLeft className="w-3 h-3" />
            Sign in as {zohoSession.email}
          </button>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${ALLOWED_DOMAIN}`}
                  autoFocus
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[#D1D1D6] bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/12 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#D1D1D6] bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/12 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#636366] transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-[12px] text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all ${
                loading
                  ? "bg-[#007AFF]/60 cursor-not-allowed"
                  : "bg-[#007AFF] hover:bg-[#0066D6] active:scale-[0.98]"
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E5E5EA]" />
            <span className="text-[11px] text-[#AEAEB2] font-medium">New here?</span>
            <div className="flex-1 h-px bg-[#E5E5EA]" />
          </div>

          {/* Signup link */}
          <Link
            to="/signup"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#D1D1D6] text-[13px] font-semibold text-[#636366] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all"
          >
            Create an account
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#AEAEB2] mt-5">
          Only <span className="font-medium text-[#636366]">@{ALLOWED_DOMAIN}</span> accounts are supported
        </p>
      </div>
    </div>
  );
}

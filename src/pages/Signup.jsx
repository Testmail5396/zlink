import React, { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, User, Briefcase } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Signup() {
  const { signup, findInvite, ALLOWED_DOMAIN } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill from invite link
  const inviteToken = searchParams.get("invite") || "";
  const inviteEmail = searchParams.get("email") || "";
  const pendingInvite = useMemo(
    () => inviteToken ? findInvite(inviteToken) : null,
    [inviteToken, findInvite]
  );

  const [form, setForm] = useState({
    name: "",
    email: inviteEmail || pendingInvite?.email || "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.email.trim()) { setError("Email is required"); return; }
    if (!form.password) { setError("Password is required"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords don't match"); return; }

    setLoading(true);
    setTimeout(() => {
      const result = signup({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        inviteToken: inviteToken || undefined,
      });
      setLoading(false);
      if (result.ok) {
        navigate("/", { replace: true });
      } else {
        setError(result.error);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#1D1D1F] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
            {pendingInvite ? "You're invited!" : "Create your account"}
          </h1>
          <p className="text-[14px] text-[#86868B] mt-1">
            {pendingInvite
              ? "Join your team on Designfolio"
              : "Sign up to start managing design links"}
          </p>
        </div>

        {/* Invite badge */}
        {pendingInvite && (
          <div className="bg-[#007AFF]/[0.06] border border-[#007AFF]/15 rounded-xl px-4 py-3 mb-4 text-center">
            <p className="text-[12px] text-[#007AFF] font-medium">
              Invited to join as <span className="font-semibold">{pendingInvite.email}</span>
            </p>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                Full name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
                <input
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="e.g. Vikash M"
                  autoFocus
                  autoComplete="name"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[#D1D1D6] bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/12 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder={`name@${ALLOWED_DOMAIN}`}
                  autoComplete="email"
                  readOnly={!!pendingInvite}
                  className={`w-full pl-10 pr-3 py-2.5 rounded-lg border border-[#D1D1D6] text-[13px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/12 transition-all ${
                    pendingInvite ? "bg-[#F5F5F7] text-[#636366] cursor-not-allowed" : "bg-[#F5F5F7] focus:bg-white"
                  }`}
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                Role <span className="text-[#AEAEB2] font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
                <input
                  type="text"
                  value={form.role}
                  onChange={set("role")}
                  placeholder="e.g. UX Designer"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[#D1D1D6] bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/12 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
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

            {/* Confirm */}
            <div>
              <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                Confirm password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
                <input
                  type={showPw ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[#D1D1D6] bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/12 focus:bg-white transition-all"
                />
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
                  Create Account
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-[#86868B] mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-[#007AFF] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/api";
import { User, Mail, Phone, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? "");
      setPhone((user as { phone?: string }).phone ?? "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await authService.updateProfile({ full_name: fullName.trim() || undefined, phone: phone.trim() || undefined });
      await refreshUser();
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.detail || err.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const roleLabel = user.role?.toUpperCase() || "";

  return (
    <div className="max-w-2xl mx-auto animate-page-enter pb-12">
      <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-slate-800">Profile</h1>
          <p className="text-sm text-slate-500 mt-1">View and edit your account details</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-border">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{user.full_name || "—"}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
              <p className="text-xs font-medium text-primary uppercase tracking-wider mt-1">{roleLabel}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Your name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-slate-500">Email cannot be changed here.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Phone number"
              />
            </div>
          </div>

          {message && (
            <p className={cn("text-sm font-medium", message.type === "success" ? "text-green-600" : "text-red-600")}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-premium px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

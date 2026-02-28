import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { managerService } from "@/services/api";
import type { Manager } from "@/types";
import {
  UserPlus,
  Key,
  Trash2,
  Loader2,
  X,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ManageManagers() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [passwordForId, setPasswordForId] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);

  const { data: managers = [], isLoading, isError } = useQuery({
    queryKey: ["managers"],
    queryFn: () => managerService.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { full_name: string; email: string; phone?: string; password: string }) =>
      managerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      setAddOpen(false);
      setAddForm({ full_name: "", email: "", phone: "", password: "" });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      managerService.setPassword(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      setPasswordForId(null);
      setNewPassword("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => managerService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["managers"] }),
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email.trim() || !addForm.password.trim()) return;
    createMutation.mutate({
      full_name: addForm.full_name.trim() || addForm.email.trim(),
      email: addForm.email.trim(),
      phone: addForm.phone.trim() || undefined,
      password: addForm.password,
    });
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForId == null || !newPassword.trim()) return;
    setPasswordMutation.mutate({ id: passwordForId, password: newPassword.trim() });
  };

  if (isError) {
    return (
      <div className="space-y-6 animate-page-enter">
        <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight uppercase italic">
          Manage <span className="text-primary">Managers</span>
        </h1>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-500 font-bold">Failed to load managers. Check your connection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-page-enter pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight uppercase italic">
            Manage <span className="text-primary">Managers</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg"
        >
          <UserPlus className="w-5 h-5" />
          Add manager
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : managers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-medium">
            No managers yet. Click “Add manager” to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider text-foreground">Name</th>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider text-foreground">Phone</th>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider text-foreground">Email</th>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider text-foreground w-52">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((m: Manager) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{m.full_name || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{m.phone || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{m.email}</td>
                    <td className="px-6 py-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordForId(m.id);
                          setNewPassword("");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-bold transition-colors"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Set password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remove manager "${m.full_name || m.email}"? They will no longer be able to sign in.`)) {
                            deleteMutation.mutate(m.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add manager dialog */}
      {addOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Add manager</h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={addForm.full_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Full name / Company name"
                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-foreground font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-foreground font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone number"
                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-foreground font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showAddPassword ? "text" : "password"}
                    required
                    value={addForm.password}
                    onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Set password"
                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-12 py-3 text-foreground font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={showAddPassword ? "Hide password" : "Show password"}
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-bold text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !addForm.email.trim() || !addForm.password}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add manager"}
                </button>
              </div>
            </form>
            {createMutation.isError && (
              <p className="text-sm text-red-500 font-medium">
                {(createMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to add manager."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Set password dialog */}
      {passwordForId != null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setPasswordForId(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Set password</h3>
              <button
                type="button"
                onClick={() => setPasswordForId(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showSetPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-12 py-3 text-foreground font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={showSetPassword ? "Hide password" : "Show password"}
                  >
                    {showSetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordForId(null)}
                  className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-bold text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={setPasswordMutation.isPending || !newPassword.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {setPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
                </button>
              </div>
            </form>
            {setPasswordMutation.isError && (
              <p className="text-sm text-red-500 font-medium">
                {(setPasswordMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to update password."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { X, User, Mail, Lock, Sparkles, Loader2, LogOut, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [claimLocal, setClaimLocal] = useState<boolean>(true);

  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    signup,
    logout,
    claimLocalProjects,
    clearError,
  } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (mode === 'signup') {
      const res = await signup(email, password, displayName);
      if (res.success) {
        if (claimLocal) {
          await claimLocalProjects();
        }
        onClose();
      }
    } else {
      const res = await login(email, password);
      if (res.success) {
        if (claimLocal) {
          await claimLocalProjects();
        }
        onClose();
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-white border border-[#E5E5EA] shadow-2xl text-[#18181B] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-black text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isAuthenticated ? 'Account Profile' : mode === 'signin' ? 'Sign In to Anim8' : 'Create Anim8 Account'}
              </h2>
              <p className="text-xs text-[#71717A]">
                {isAuthenticated
                  ? 'Connected to Neon Cloud database'
                  : 'Sync projects across devices & enable cloud backups'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isAuthenticated && user ? (
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-2xl bg-[#F7F7FA] border border-[#E5E5EA] space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold">{user.displayName}</h3>
                  <p className="text-xs text-[#71717A]">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold pt-1 border-t border-[#E5E5EA]">
                <Check className="w-4 h-4" />
                <span>Cloud Backup & Multi-Device Sync Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={async () => {
                  const count = await claimLocalProjects();
                  alert(`Synced ${count} local project(s) to your cloud account!`);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-black transition-colors"
              >
                Sync Local Projects
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-3.5">
            {/* Mode Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F7F7FA] border border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  clearError();
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  mode === 'signin' ? 'bg-white shadow-xs text-black' : 'text-[#71717A] hover:text-black'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  clearError();
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  mode === 'signup' ? 'bg-white shadow-xs text-black' : 'text-[#71717A] hover:text-black'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold mb-1 text-black">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Animator Name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E5EA] bg-[#F7F7FA] focus:bg-white focus:border-black text-xs font-medium focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1 text-black">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="animator@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E5EA] bg-[#F7F7FA] focus:bg-white focus:border-black text-xs font-medium focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-black">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E5EA] bg-[#F7F7FA] focus:bg-white focus:border-black text-xs font-medium focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="claimLocal"
                checked={claimLocal}
                onChange={(e) => setClaimLocal(e.target.checked)}
                className="rounded border-[#E5E5EA] text-black focus:ring-black"
              />
              <label htmlFor="claimLocal" className="text-xs text-[#71717A] cursor-pointer">
                Automatically backup my existing local animations to cloud
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5 mt-2"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

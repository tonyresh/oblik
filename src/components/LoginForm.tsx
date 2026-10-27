import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { useToast } from '../store/ToastContext';
import { Logo } from './Logo';
import {
  Mail,
  LogIn,
  AlertCircle,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Send,
  X,
  CheckCircle2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function LoginForm() {
  const { login, authorizedUsers, requestNewPassword, superadminEmails } = useAuth();
  const { reloadAuthoritativeDatabase } = useData();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password reset request modal state
  const [showPasswordRequestModal, setShowPasswordRequestModal] = useState(false);
  const [reqEmail, setReqEmail] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestResult, setRequestResult] = useState<{ message: string; mailtoUrl?: string } | null>(null);

  const handleOpenPasswordRequest = (prefilledEmail?: string) => {
    const targetEmail = prefilledEmail || email;
    setReqEmail(targetEmail);
    const existing = authorizedUsers.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
    setReqName(existing ? existing.name : '');
    setReqNotes('');
    setRequestResult(null);
    setShowPasswordRequestModal(true);
  };

  const handleSendPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEmail.trim()) {
      showToast('Вкажіть електронну пошту', 'error');
      return;
    }

    setIsSendingRequest(true);
    try {
      const existing = authorizedUsers.find(u => u.email.toLowerCase() === reqEmail.trim().toLowerCase());
      const res = await requestNewPassword({
        userId: existing ? existing.id : 'external-' + Date.now(),
        userEmail: reqEmail.trim(),
        userName: reqName.trim() || existing?.name || reqEmail.trim().split('@')[0],
        notes: reqNotes.trim()
      });

      if (res.success) {
        setRequestResult({ message: res.message, mailtoUrl: res.mailtoUrl });
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Try server-side validation first
      const serverRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      }).catch(() => null);

      let loggedInUser = null;

      if (serverRes && serverRes.ok) {
        const json = await serverRes.json();
        if (json.success) {
          const result = login(email.trim(), password);
          if (result.success) {
            loggedInUser = result.user;
          }
        }
      }

      if (!loggedInUser) {
        // 2. Client fallback
        const result = login(email.trim(), password);
        if (!result.success) {
          setError(result.message);
          showToast(result.message, 'error');
          return;
        }
        loggedInUser = result.user;
      }

      if (loggedInUser) {
        // For administrators, load latest authoritative database immediately
        const isAdmin = loggedInUser.roleId === 'admin' ||
          superadminEmails.some(se => se.toLowerCase() === loggedInUser.email.toLowerCase()) ||
          loggedInUser.email.toLowerCase() === 'admin@skud.local';

        if (isAdmin) {
          try {
            await reloadAuthoritativeDatabase(true);
            showToast('Актуальну базу даних завантажено із сервера', 'info');
          } catch (loadErr) {
            console.error('Error reloading database for admin:', loadErr);
          }
        }
        showToast('Успішний вхід до системи', 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-background relative overflow-hidden select-none">
      {/* Background Decorative Accents */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-3xl p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3 scale-110">
            <Logo />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Контроль доступу та безпека</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Вхід до системи обліку
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm">
            Авторизація оператора КПП та персоналу охорони
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive flex items-start gap-3 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Помилка авторизації</p>
              <p className="text-destructive/90 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Електронна пошта</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                autoFocus
                placeholder="name@checkpoint.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Пароль</span>
              </label>
              <button
                type="button"
                onClick={() => handleOpenPasswordRequest(email)}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                title="Надіслати запит нового паролю Суперадміністратору"
              >
                <Mail className="w-3 h-3" />
                <span>Запит нового паролю</span>
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Введіть пароль"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full pl-11 pr-11 py-3 rounded-2xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showPassword ? 'Сховати пароль' : 'Показати пароль'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] mt-3"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Перевірка...' : 'Увійти в систему'}</span>
          </button>
        </form>

        {/* Security & Encryption Footer */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>База даних захищена шифруванням AES-256-GCM</span>
        </div>
      </div>

      {/* Modal: Password Reset Request to Superadministrator */}
      {showPasswordRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Запит нового паролю</h3>
                  <p className="text-xs text-muted-foreground">Повідомлення Суперадміністратору</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordRequestModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {requestResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-foreground flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      Запит успішно надіслано!
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {requestResult.message}
                    </p>
                    <p className="text-muted-foreground pt-1">
                      Отримувач (Суперадміністратор): <span className="font-mono font-bold text-foreground">{superadminEmails.join(', ')}</span>
                    </p>
                  </div>
                </div>

                {requestResult.mailtoUrl && (
                  <a
                    href={requestResult.mailtoUrl}
                    className="w-full h-11 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Відкрити у поштовій програмі (Email Client)</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowPasswordRequestModal(false)}
                  className="w-full h-11 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Закрити
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendPasswordRequest} className="space-y-4">
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Shield className="w-4 h-4 text-primary shrink-0" />
                    <span>Одержувач сповіщення:</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Лист буде відправлено на скриньку Суперадміністратора:{' '}
                    <span className="font-mono font-bold text-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                      {superadminEmails.join(', ')}
                    </span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ваш Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@checkpoint.com"
                    value={reqEmail}
                    onChange={(e) => {
                      setReqEmail(e.target.value);
                      const ex = authorizedUsers.find(u => u.email.toLowerCase() === e.target.value.toLowerCase());
                      if (ex && !reqName) setReqName(ex.name);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Прізвище та ім'я
                  </label>
                  <input
                    type="text"
                    placeholder="Іван Петренко"
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Причина / коментар (необов'язково)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Наприклад: забув пароль або потрібен доступ до зміни..."
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordRequestModal(false)}
                    className="flex-1 h-11 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingRequest || !reqEmail.trim()}
                    className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingRequest ? (
                      <span>Надсилання...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Надіслати запит</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../store/ThemeContext';
import { Home, Users, Shield, Settings, FileText, TriangleAlert, Cloud, ShieldCheck, LogOut, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useData } from '../store/DataContext';
import { useToast } from '../store/ToastContext';
import { useAuth } from '../store/AuthContext';
import { format } from 'date-fns';
import LoginForm from './LoginForm';
import { Logo } from './Logo';
import UserManualModal from './UserManualModal';

export default function Layout() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { dirtySkyEvents, startDirtySky, endDirtySky, syncStatus, onlineClientsCount } = useData();
  const { showToast } = useToast();
  const { currentUser, currentRole, isAuthenticated, logout, hasPermission, canAccessRoute } = useAuth();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const activeDirtySky = dirtySkyEvents.find(e => !e.endTime);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // If not logged in, present the Login Form
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const allNavItems = [
    { to: '/', icon: Home, label: 'Дашборд' },
    { to: '/visitors', icon: Users, label: 'Відвідувачі' },
    { to: '/security', icon: Shield, label: 'Охорона' },
    { to: '/reports', icon: FileText, label: 'Звіти' },
    { to: '/roles', icon: ShieldCheck, label: 'Доступ' },
    { to: '/settings', icon: Settings, label: 'Налаштування' },
  ];

  // Filter or show nav items based on role access
  // 1) Вкладка Доступ повинна відображатись лише у користувачів з правами Суперадмін
  // 2) Вкладка Звіти також лише у тих користувачів у яких є доступ до них
  const navItems = allNavItems.filter(item => {
    if (item.to === '/roles') {
      return currentRole?.id === 'admin';
    }
    if (item.to === '/reports') {
      return hasPermission('reports.view') || currentRole?.id === 'admin';
    }
    return canAccessRoute(item.to);
  });

  const handleDirtySkyClick = (turnOn: boolean) => {
    if (!hasPermission('security.dirty_sky') && currentRole?.id !== 'admin') {
      showToast('У вашої ролі немає дозволу на управління режимом «Брудне небо»', 'error');
      return;
    }

    if (turnOn) {
      startDirtySky();
      showToast('РЕЖИМ БРУДНЕ НЕБО АКТИВОВАНО!', 'error');
    } else {
      endDirtySky();
      showToast('Режим Брудне небо завершено', 'success');
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    showToast('Вихід з облікового запису успішно виконано', 'info');
  };

  // Route permission check for currently rendered page
  const isCurrentRouteAllowed = canAccessRoute(location.pathname);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-foreground">
      {/* Top Header */}
      <header
        style={{
          height: 'clamp(58px, 5.2vw, 74px)',
          paddingLeft: 'clamp(10px, 1.4vw, 24px)',
          paddingRight: 'clamp(10px, 1.4vw, 24px)',
          gap: 'clamp(8px, 1.1vw, 18px)'
        }}
        className="hidden landscape:flex items-center justify-between border-b border-border bg-card shrink-0 select-none no-print"
      >
        {/* Left Section: Logo, Clock, and Dirty Sky controls */}
        <div className="flex-1 flex items-center justify-between min-w-0" style={{ gap: 'clamp(8px, 1vw, 16px)' }}>
          {/* Logo */}
          <div className="shrink-0 flex items-center">
            <Logo className="w-auto shrink-0" />
          </div>

          {/* Clock centered between Logo and Dirty Sky */}
          <div className="flex-1 flex justify-center items-center min-w-0 px-1 sm:px-2">
            <div className="flex flex-col items-center justify-center leading-none text-center">
              <span
                style={{ fontSize: 'clamp(16px, 1.7vw, 28px)' }}
                className="font-semibold tabular-nums tracking-tight text-foreground"
              >
                {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit', hour12: false})}
              </span>
              <span
                style={{ fontSize: 'clamp(8px, 0.7vw, 10.5px)', marginTop: 'clamp(2px, 0.25vw, 4px)' }}
                className="font-bold tracking-[0.12em] text-muted-foreground uppercase"
              >
                {currentTime.toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/\s*р\.?$/, '')}
              </span>
            </div>
          </div>

          {/* Dirty Sky Controls */}
          <div className="shrink-0 flex items-center px-1 sm:px-2">
            {!activeDirtySky ? (
              <div className="flex items-center select-none shrink-0" style={{ gap: 'clamp(6px, 0.6vw, 10px)' }}>
                <span
                  style={{ fontSize: 'clamp(9.5px, 0.82vw, 13px)' }}
                  className="font-bold tracking-wider uppercase text-muted-foreground whitespace-nowrap"
                >
                  Брудне небо
                </span>
                <button
                  onClick={() => handleDirtySkyClick(true)}
                  style={{
                    height: 'clamp(28px, 2.5vw, 36px)',
                    width: 'clamp(44px, 4vw, 62px)',
                    fontSize: 'clamp(10px, 0.85vw, 13px)'
                  }}
                  className="rounded-lg bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black uppercase transition-all flex items-center justify-center cursor-pointer select-none shadow-sm shadow-red-500/10 font-sans"
                  title="Увімкнути режим Брудне небо"
                >
                  ON
                </button>
              </div>
            ) : (
              <div className="flex items-center select-none shrink-0 justify-center" style={{ gap: 'clamp(6px, 0.7vw, 12px)' }}>
                <div
                  style={{ fontSize: 'clamp(10.5px, 0.9vw, 14px)', gap: 'clamp(4px, 0.4vw, 6px)' }}
                  className="flex items-center text-red-500 animate-pulse font-extrabold uppercase tracking-wider whitespace-nowrap"
                >
                  <TriangleAlert
                    style={{ width: 'clamp(14px, 1.25vw, 20px)', height: 'clamp(14px, 1.25vw, 20px)' }}
                    className="shrink-0"
                  />
                  <span>Брудне небо</span>
                </div>
                <button
                  onClick={() => handleDirtySkyClick(false)}
                  style={{
                    height: 'clamp(28px, 2.5vw, 36px)',
                    width: 'clamp(44px, 4vw, 62px)',
                    fontSize: 'clamp(10px, 0.85vw, 13px)'
                  }}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black uppercase transition-all flex items-center justify-center cursor-pointer select-none shadow-sm shadow-emerald-500/10 font-sans shrink-0"
                  title="Вимкнути режим Брудне небо"
                >
                  OFF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Nav Menu and User Profile with light separator */}
        <div
          className="shrink-0 flex items-center justify-end min-w-0 border-l border-border/40"
          style={{ paddingLeft: 'clamp(6px, 0.8vw, 14px)', gap: 'clamp(4px, 0.55vw, 10px)' }}
        >
          {/* Real-time server sync badge */}
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-secondary/50 border border-border/50 text-xs shrink-0 select-none"
            title={
              syncStatus === 'connected' 
                ? `Синхронізація в реальному часі активна. Підключено операторів: ${onlineClientsCount}`
                : syncStatus === 'connecting'
                  ? 'Підключення до сервера синхронізації...'
                  : 'Офлайн режим (автоматичне підключення...)'
            }
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              syncStatus === 'connected' 
                ? 'bg-emerald-500 animate-pulse' 
                : syncStatus === 'connecting' 
                  ? 'bg-amber-500 animate-pulse' 
                  : 'bg-red-500'
            }`} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:inline">
              {syncStatus === 'connected' ? (onlineClientsCount > 1 ? `${onlineClientsCount} онлайн` : 'В мережі') : syncStatus === 'connecting' ? 'З\'єднання' : 'Офлайн'}
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex items-center overflow-x-auto hide-scrollbar" style={{ gap: 'clamp(2px, 0.35vw, 6px)' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  height: 'clamp(44px, 4.1vw, 58px)',
                  minWidth: 'clamp(46px, 4.4vw, 68px)',
                  paddingLeft: 'clamp(3px, 0.4vw, 8px)',
                  paddingRight: 'clamp(3px, 0.4vw, 8px)',
                  paddingTop: 'clamp(2px, 0.25vw, 5px)',
                  paddingBottom: 'clamp(2px, 0.25vw, 5px)',
                }}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center rounded-xl transition-all text-center",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <item.icon
                  style={{
                    width: 'clamp(16px, 1.4vw, 21px)',
                    height: 'clamp(16px, 1.4vw, 21px)',
                    marginBottom: 'clamp(1px, 0.15vw, 3px)'
                  }}
                />
                <span
                  style={{ fontSize: 'clamp(7.5px, 0.68vw, 10px)' }}
                  className="font-bold tracking-wider uppercase leading-none whitespace-nowrap"
                >
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>

          {/* User Profile Chip & Logout */}
          <div
            className="flex items-center border-l border-border/40"
            style={{ paddingLeft: 'clamp(5px, 0.6vw, 10px)', gap: 'clamp(4px, 0.5vw, 8px)' }}
          >
            <div
              style={{
                paddingTop: 'clamp(2px, 0.25vw, 5px)',
                paddingBottom: 'clamp(2px, 0.25vw, 5px)',
                paddingLeft: 'clamp(4px, 0.45vw, 9px)',
                paddingRight: 'clamp(4px, 0.45vw, 9px)',
                gap: 'clamp(4px, 0.45vw, 8px)'
              }}
              className="flex items-center rounded-xl bg-secondary/40 border border-border/60"
              title={`Авторизовано: ${currentUser?.email} (${currentRole?.name})`}
            >
              <div
                style={{
                  width: 'clamp(24px, 2.1vw, 32px)',
                  height: 'clamp(24px, 2.1vw, 32px)',
                  fontSize: 'clamp(9.5px, 0.8vw, 12px)',
                  backgroundColor: currentUser?.avatarColor || '#3b82f6'
                }}
                className="rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow-xs overflow-hidden"
              >
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="hidden xl:flex flex-col text-left leading-tight">
                <span
                  style={{
                    fontSize: 'clamp(10px, 0.85vw, 12.5px)',
                    maxWidth: 'clamp(80px, 8vw, 130px)'
                  }}
                  className="font-bold text-foreground truncate"
                >
                  {currentUser?.name}
                </span>
                <span
                  style={{
                    fontSize: 'clamp(8px, 0.65vw, 9.5px)',
                    maxWidth: 'clamp(80px, 8vw, 130px)',
                    color: currentRole?.color || '#3b82f6'
                  }}
                  className="font-semibold truncate"
                >
                  {currentRole?.name}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: 'clamp(28px, 2.4vw, 36px)',
                height: 'clamp(28px, 2.4vw, 36px)'
              }}
              className="rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/60 transition-all cursor-pointer shrink-0"
              title="Вийти з облікового запису"
            >
              <LogOut
                style={{ width: 'clamp(13px, 1.1vw, 17px)', height: 'clamp(13px, 1.1vw, 17px)' }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className={cn(
        "flex-1 overflow-auto portrait:pb-24",
        location.pathname.startsWith('/visitors') ? "p-0" : "p-3 md:p-5"
      )}>
        {!isCurrentRouteAllowed ? (
          <div className="max-w-md mx-auto my-12 p-6 rounded-3xl bg-card border border-border shadow-xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Доступ обмежено</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ваша роль ({currentRole?.name}) не має прав для перегляду цієї сторінки. Зверніться до адміністратора системи для розширення повноважень.
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Bottom Navigation for Portrait vertical orientation */}
      <nav
        style={{
          height: 'clamp(52px, 7.5vh, 64px)',
          gap: 'clamp(2px, 1.2vw, 6px)',
          paddingLeft: 'clamp(6px, 2vw, 12px)',
          paddingRight: 'clamp(6px, 2vw, 12px)',
        }}
        className="flex landscape:hidden fixed bottom-1 left-2 right-2 sm:left-4 sm:right-4 z-50 items-center justify-around bg-neutral-950/98 backdrop-blur-lg border border-neutral-800/85 rounded-2xl shadow-2xl select-none mb-1 no-print text-white"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={{
              height: 'clamp(40px, 6vh, 48px)',
              width: 'clamp(40px, 13vw, 56px)',
              padding: 'clamp(2px, 0.4vh, 4px)',
            }}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center rounded-2xl transition-all text-center font-roboto",
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
            )}
          >
            <item.icon
              style={{
                width: 'clamp(16px, 2.3vh, 20px)',
                height: 'clamp(16px, 2.3vh, 20px)',
                marginBottom: 'clamp(1px, 0.2vh, 2px)'
              }}
            />
            <span
              style={{ fontSize: 'clamp(6.8px, 1.8vw, 8.5px)' }}
              className="font-bold tracking-wider uppercase leading-none whitespace-nowrap"
            >
              {item.label}
            </span>
          </NavLink>
        ))}

        {/* Mobile Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            height: 'clamp(40px, 6vh, 48px)',
            width: 'clamp(40px, 13vw, 56px)',
            padding: 'clamp(2px, 0.4vh, 4px)',
          }}
          className="flex flex-col items-center justify-center rounded-2xl transition-all text-center text-zinc-400 hover:text-destructive cursor-pointer"
          title="Вийти"
        >
          <LogOut
            style={{
              width: 'clamp(16px, 2.3vh, 20px)',
              height: 'clamp(16px, 2.3vh, 20px)',
              marginBottom: 'clamp(1px, 0.2vh, 2px)'
            }}
          />
          <span
            style={{ fontSize: 'clamp(6.8px, 1.8vw, 8.5px)' }}
            className="font-bold tracking-wider uppercase leading-none whitespace-nowrap"
          >
            Вихід
          </span>
        </button>
      </nav>

      {/* Confirmation Modal for Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl text-center space-y-3.5 sm:space-y-4 animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto my-auto">
            <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Вихід з облікового запису</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ви дійсно бажаєте вийти з системи обліку?
              </p>
              {currentUser && (
                <div className="mt-3 p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center gap-2.5 text-left">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: currentUser.avatarColor || '#3b82f6' }}
                  >
                    {currentUser.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{currentUser.email}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-10 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-destructive/20"
              >
                Вийти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official User Manual Modal & PDF Exporter */}
      <UserManualModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
      />
    </div>
  );
}

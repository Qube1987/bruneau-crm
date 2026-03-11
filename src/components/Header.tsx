import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, ChevronDown, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlobalClientSearch from './GlobalClientSearch';
import { PushSettings } from './PushSettings';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '../hooks/useNotifications';

interface HeaderProps {
  onNavigate?: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showPushSettings, setShowPushSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <img
                src="/BRUNEAU_PROTECTION_LOGO_QUADRI.png"
                alt="Logo"
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-primary-900 hidden sm:block">
                CRM
              </span>
            </div>

            <div className="flex-1 min-w-0 max-w-2xl px-1 sm:px-4">
              <GlobalClientSearch />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell with Badge */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-primary-700' : 'text-gray-700'}`} />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-sm"
                    style={{
                      animation: 'badgePulse 2s ease-in-out infinite',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <style>{`
                  @keyframes badgePulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                  }
                `}</style>
              </button>

              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  unreadCount={unreadCount}
                  loading={notifLoading}
                  onMarkAsRead={markAsRead}
                  onMarkAllAsRead={markAllAsRead}
                  onClose={() => setShowNotifications(false)}
                  onOpenSettings={() => setShowPushSettings(true)}
                  onNavigate={onNavigate}
                />
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Menu utilisateur"
              >
                <User className="h-5 w-5 text-gray-700" />
                <ChevronDown className={`h-4 w-4 text-gray-700 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-900 font-medium">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showPushSettings && <PushSettings onClose={() => setShowPushSettings(false)} />}
    </header>
  );
};

export default Header;
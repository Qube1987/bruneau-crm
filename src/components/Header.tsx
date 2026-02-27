import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlobalClientSearch from './GlobalClientSearch';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="/crm-android-chrome-512x512_(1).png"
              alt="CRM Icon"
              className="h-10 w-10 rounded-lg"
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">CRM Bruneau Protection</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <GlobalClientSearch />

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

            <img
              src="/BRUNEAU_PROTECTION_LOGO_QUADRI.png"
              alt="Bruneau Protection"
              className="h-10"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
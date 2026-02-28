import React from 'react';
import { Users, Target, Plus, Hammer, TrendingUp, FileText } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'opportunities', label: 'Devis', icon: Target },
    { id: 'relances-factures', label: 'Factures', icon: FileText },
    { id: 'chantiers', label: 'Chantiers', icon: Hammer },
    { id: 'valeur-a-vie', label: 'Valeur à vie', icon: TrendingUp },
    { id: 'prospection', label: 'Prospection', icon: Users },
    { id: 'actions-commerciales', label: 'Actions commerciales', icon: Users },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex overflow-x-auto no-scrollbar py-2">
          <div className="flex space-x-2 sm:space-x-8 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
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
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-4 sm:space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? 'border-accent-500 text-accent-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="mr-1 sm:mr-2 h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
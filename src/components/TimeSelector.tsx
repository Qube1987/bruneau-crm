import React from 'react';
import { Calendar } from 'lucide-react';

interface TimeSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  label,
  value,
  onChange,
  required = false,
  error,
  icon = <Calendar className="h-4 w-4 inline mr-2" />
}) => {
  const parseDateTime = (dateTimeString: string) => {
    if (!dateTimeString) {
      const now = new Date();
      return {
        date: now.toISOString().split('T')[0],
        hours: now.getHours().toString().padStart(2, '0'),
        minutes: '00'
      };
    }

    const [date, time] = dateTimeString.split('T');
    const [hours, minutes] = time ? time.split(':') : ['00', '00'];

    return {
      date: date || new Date().toISOString().split('T')[0],
      hours: hours || '00',
      minutes: minutes || '00'
    };
  };

  const { date, hours, minutes } = parseDateTime(value);

  const handleChange = (newDate: string, newHours: string, newMinutes: string) => {
    const newValue = `${newDate}T${newHours}:${newMinutes}`;
    onChange(newValue);
  };

  const hoursOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
  );

  const minutesOptions = ['00', '15', '30', '45'];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {icon}
        {label} {required && '*'}
      </label>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <input
            type="date"
            value={date}
            onChange={(e) => handleChange(e.target.value, hours, minutes)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors text-sm ${
              error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'
            }`}
          />
        </div>

        <div className="col-span-1">
          <select
            value={hours}
            onChange={(e) => handleChange(date, e.target.value, minutes)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors text-sm ${
              error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'
            }`}
          >
            {hoursOptions.map(hour => (
              <option key={hour} value={hour}>{hour}h</option>
            ))}
          </select>
        </div>

        <div className="col-span-1">
          <select
            value={minutes}
            onChange={(e) => handleChange(date, hours, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors text-sm ${
              error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'
            }`}
          >
            {minutesOptions.map(minute => (
              <option key={minute} value={minute}>{minute}min</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

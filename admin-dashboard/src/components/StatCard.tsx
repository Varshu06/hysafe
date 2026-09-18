import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down';
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  change,
  trend,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-border hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-secondary text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
          {change !== undefined && (
            <p
              className={`text-sm mt-2 ${
                trend === 'up' ? 'text-success' : 'text-danger'
              }`}
            >
              {trend === 'up' ? '↑' : '↓'} {Math.abs(change)}% from last month
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center text-primary text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
};

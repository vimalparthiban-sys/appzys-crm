import React from 'react';

export const PIPELINE_STAGES = [
  { key: 'FOUND', label: 'Found', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'CONTACTED', label: 'Contacted', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'REPLY_RECEIVED', label: 'Reply Received', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'INTERESTED', label: 'Interested', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'MEETING', label: 'Meeting', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'CONVERTED', label: 'Converted', color: 'bg-green-100 text-green-800 border-green-300 font-semibold' },
  { key: 'NO_REPLY', label: 'No Reply', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { key: 'REJECTED', label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export default function StatusBadge({ status, className = '' }) {
  const stage = PIPELINE_STAGES.find((s) => s.key === status) || {
    label: status,
    color: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${stage.color} ${className}`}
    >
      {stage.label}
    </span>
  );
}

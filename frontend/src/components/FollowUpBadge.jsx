import React, { useState } from 'react';
import { Calendar, AlertCircle, CheckCircle2, Clock, History, XCircle } from 'lucide-react';

export default function FollowUpBadge({ urgency, date, className = '' }) {
  if (urgency === 'TODAY') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
        <Calendar className="w-3.5 h-3.5" />
        <span>Today</span>
      </span>
    );
  }

  if (urgency === 'OVERDUE') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 ${className}`}>
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Overdue</span>
      </span>
    );
  }

  if (urgency === 'UPCOMING') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>{date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Upcoming'}</span>
      </span>
    );
  }

  if (urgency === 'COMPLETED') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
        <span>Completed</span>
      </span>
    );
  }

  if (urgency === 'RESCHEDULED') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
        <History className="w-3.5 h-3.5 text-purple-600" />
        <span>Rescheduled</span>
      </span>
    );
  }

  if (urgency === 'CANCELLED') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 ${className}`}>
        <XCircle className="w-3.5 h-3.5 text-gray-500" />
        <span>Cancelled</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-gray-400 border border-dashed border-gray-200 ${className}`}>
      <span>No date</span>
    </span>
  );
}

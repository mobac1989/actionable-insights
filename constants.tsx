
import React from 'react';
import { ShieldAlert, Info, AlertTriangle, Zap } from 'lucide-react';
import { ImpactRating } from './types';

export const ROLES = [
  "Project Manager",
  "Project Director",
  "Superintendent",
  "Planner",
  "QA/QC",
  "Operations",
  "Other"
];

export const IMPACT_CONFIG: Record<ImpactRating, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  not_relevant: {
    label: "Not Relevant",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: <ShieldAlert className="w-8 h-8" />
  },
  nice_to_know: {
    label: "Nice to Know",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    icon: <Info className="w-8 h-8" />
  },
  requires_attention: {
    label: "Requires Attention",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    icon: <AlertTriangle className="w-8 h-8" />
  },
  immediate_action: {
    label: "Immediate Action",
    color: "text-red-500",
    bgColor: "bg-red-50",
    icon: <Zap className="w-8 h-8" />
  }
};

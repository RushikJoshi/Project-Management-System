import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Briefcase, 
  Palette, 
  Code2, 
  ShieldCheck, 
  Server, 
  Trophy, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { cn } from '../utils/helpers';

interface StagePlan {
  name: string;
  durationDays: number;
  notes?: string;
  enabled?: boolean;
}

interface EnterpriseTimelineProps {
  startDate?: string;
  endDate?: string;
  sdlcPlan: StagePlan[];
  projectProgress?: number;
  projectStatus?: string;
  interactive?: boolean;
  onStageClick?: (index: number) => void;
}

// Map phase names to elegant metadata with helpful user-friendly descriptions
const mapStageMetadata = (name: string) => {
  const norm = name.toLowerCase();
  
  if (norm.includes('req') || norm.includes('analysis') || norm.includes('biz') || norm.includes('business')) {
    return {
      role: 'Business Analyst',
      color: '#8b5cf6', // Deep Purple
      icon: ClipboardList,
      description: 'Understanding requirements and scoping the project.',
    };
  }
  if (norm.includes('plan') || norm.includes('roadmap') || norm.includes('strategy') || norm.includes('pm')) {
    return {
      role: 'Project Manager',
      color: '#3b82f6', // Bright Blue
      icon: Briefcase,
      description: 'Setting up timelines, resources, and strategies.',
    };
  }
  if (norm.includes('design') || norm.includes('ui') || norm.includes('ux') || norm.includes('art') || norm.includes('wireframe')) {
    return {
      role: 'UI/UX Designer',
      color: '#06b6d4', // Cyan
      icon: Palette,
      description: 'Creating screen designs, wireframes, and prototypes.',
    };
  }
  if (norm.includes('dev') || norm.includes('code') || norm.includes('build') || norm.includes('backend') || norm.includes('frontend')) {
    return {
      role: 'Software Developers',
      color: '#10b981', // Emerald / Green
      icon: Code2,
      description: 'Writing code and building the core system features.',
    };
  }
  if (norm.includes('test') || norm.includes('qa') || norm.includes('quality') || norm.includes('bug')) {
    return {
      role: 'QA / Testing Team',
      color: '#f59e0b', // Amber
      icon: ShieldCheck,
      description: 'Testing the app to find and fix bugs or quality issues.',
    };
  }
  if (norm.includes('deploy') || norm.includes('release') || norm.includes('launch') || norm.includes('devops')) {
    return {
      role: 'DevOps Engineer',
      color: '#f97316', // Orange
      icon: Server,
      description: 'Launching the project live to servers and users.',
    };
  }
  if (norm.includes('complete') || norm.includes('maintenance') || norm.includes('support') || norm.includes('handover')) {
    return {
      role: 'Project Team',
      color: '#ec4899', // Pink
      icon: Trophy,
      description: 'Handing over the project and offering support.',
    };
  }
  
  // Default fallback for custom names
  return {
    role: 'Project Team',
    color: '#64748b', // Slate Gray
    icon: HelpCircle,
    description: 'Custom customized project milestone.',
  };
};

export const EnterpriseTimeline: React.FC<EnterpriseTimelineProps> = ({
  startDate,
  endDate,
  sdlcPlan = [],
  projectProgress = 0,
  projectStatus = 'active',
  interactive = false,
  onStageClick
}) => {
  // Filter out disabled or 0-duration stages
  const enabledStages = useMemo(() => {
    return sdlcPlan.filter(s => s.enabled !== false && s.durationDays > 0);
  }, [sdlcPlan]);

  const baseDate = useMemo(() => {
    if (!startDate) return new Date();
    const d = new Date(startDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [startDate]);

  // Calculate chronological dates and statuses
  const calculatedStages = useMemo(() => {
    let currentOffset = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    const stagesCount = enabledStages.length;

    const stagesWithDates = enabledStages.map((stage, idx) => {
      const metadata = mapStageMetadata(stage.name);
      
      const stageStart = new Date(baseDate);
      stageStart.setDate(baseDate.getDate() + currentOffset);
      
      const stageEnd = new Date(stageStart);
      stageEnd.setDate(stageStart.getDate() + stage.durationDays - 1);
      
      currentOffset += stage.durationDays;

      return {
        ...stage,
        index: idx,
        metadata,
        startDate: stageStart,
        endDate: stageEnd,
        durationDays: stage.durationDays,
      };
    });

    // Add Completed virtual stage at the end
    if (stagesWithDates.length > 0) {
      const lastStage = stagesWithDates[stagesWithDates.length - 1];
      const completedStart = new Date(lastStage.endDate);
      completedStart.setDate(completedStart.getDate() + 1);
      
      stagesWithDates.push({
        name: 'Completed',
        durationDays: 0,
        index: stagesWithDates.length,
        metadata: mapStageMetadata('complete'),
        startDate: completedStart,
        endDate: completedStart,
      });
    }

    let activeIndex = -1;
    for (let i = 0; i < stagesCount; i++) {
      if (today <= stagesWithDates[i].endDate) {
        activeIndex = i;
        break;
      }
    }

    if (activeIndex === -1 && stagesCount > 0) {
      activeIndex = stagesCount - 1;
    }

    return stagesWithDates.map((stage, idx) => {
      let status: 'completed' | 'in_progress' | 'pending' | 'delayed' = 'pending';
      let progressVal = 0;

      if (projectStatus === 'completed') {
        status = 'completed';
        progressVal = 100;
      } else {
        if (idx < activeIndex) {
          status = 'completed';
          progressVal = 100;
        } else if (idx === activeIndex) {
          if (today < stage.startDate) {
            status = 'pending';
            progressVal = 0;
          } else if (today > stage.endDate) {
            status = 'delayed';
            progressVal = 100;
          } else {
            status = 'in_progress';
            const totalMs = stage.endDate.getTime() - stage.startDate.getTime() + 86400000;
            const elapsedMs = today.getTime() - stage.startDate.getTime();
            progressVal = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
          }
        } else {
          status = 'pending';
          progressVal = 0;
        }
      }

      return {
        ...stage,
        status,
        progress: progressVal,
      };
    });
  }, [enabledStages, baseDate, projectStatus]);

  // Handle empty state gracefully
  if (calculatedStages.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-3xl text-center text-surface-400">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-40 text-brand-500" />
        <p className="text-sm font-bold">No active delivery phases defined</p>
        <p className="text-xs text-surface-400 mt-1">Enable stages above and set durations to view your timeline.</p>
      </div>
    );
  }

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl p-6 font-sans select-none shadow-sm mt-4">
      {/* Header section with plain language titles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-surface-100 dark:border-surface-800 pb-4">
        <div>
          <h3 className="font-display font-bold text-sm tracking-tight text-surface-900 dark:text-white">
            📅 Project Delivery Roadmap
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            See how your project milestones line up based on your chosen stage durations.
          </p>
        </div>

        {/* Unified visual legend */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded-full border border-blue-100 dark:border-blue-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Active
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-full border border-rose-100 dark:border-rose-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Delayed
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-surface-500 bg-surface-50 dark:bg-surface-800 px-2 py-1 rounded-full border border-surface-100 dark:border-surface-700">
            <span className="w-1.5 h-1.5 rounded-full bg-surface-300 dark:bg-surface-700" /> Scheduled
          </span>
        </div>
      </div>

      {/* Main Roadmap Carousel View - Infinite space, never squished! */}
      <div className="flex items-stretch gap-4 overflow-x-auto pb-5 scrollbar-hide snap-x">
        {calculatedStages.map((stage, idx) => {
          const Icon = stage.metadata.icon;
          const isLast = idx === calculatedStages.length - 1;
          
          // Status styles
          const statusStyles = {
            completed: {
              card: 'border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/5',
              badge: 'bg-emerald-500 text-white',
              titleColor: 'text-surface-900 dark:text-white',
              roleColor: 'text-emerald-700 dark:text-emerald-400',
              iconBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
            },
            in_progress: {
              card: 'border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/10 ring-2 ring-blue-500/10 shadow-md shadow-blue-500/5',
              badge: 'bg-blue-500 text-white animate-pulse',
              titleColor: 'text-surface-900 dark:text-white font-extrabold',
              roleColor: 'text-blue-700 dark:text-blue-400',
              iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
            },
            delayed: {
              card: 'border-rose-500/30 bg-rose-50/30 dark:bg-rose-950/10 shadow-sm animate-pulse',
              badge: 'bg-rose-500 text-white',
              titleColor: 'text-surface-900 dark:text-white font-extrabold',
              roleColor: 'text-rose-700 dark:text-rose-400',
              iconBg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
            },
            pending: {
              card: 'border-surface-200 bg-white dark:bg-surface-900/50',
              badge: 'bg-surface-200 dark:bg-surface-800 text-surface-500 dark:text-surface-400',
              titleColor: 'text-surface-700 dark:text-surface-300',
              roleColor: 'text-surface-400 dark:text-surface-500',
              iconBg: 'bg-surface-100 dark:bg-surface-800 text-surface-400'
            }
          };

          const currentStyle = statusStyles[stage.status];

          return (
            <React.Fragment key={stage.name}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className={cn(
                  "flex-shrink-0 w-[220px] border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 snap-start",
                  interactive && "cursor-pointer hover:shadow-md hover:border-brand-500/30",
                  currentStyle.card
                )}
                onClick={() => interactive && onStageClick?.(stage.index)}
              >
                <div>
                  {/* Card Header (Milestone badge + Icon) */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn("text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md uppercase", currentStyle.badge)}>
                      Milestone {idx + 1}
                    </span>
                    <div className={cn("p-1.5 rounded-lg", currentStyle.iconBg)}>
                      <Icon size={14} />
                    </div>
                  </div>

                  {/* Title & Role */}
                  <h4 className={cn("text-sm font-bold truncate leading-tight", currentStyle.titleColor)} title={stage.name}>
                    {stage.name}
                  </h4>
                  <p className={cn("text-[10px] font-bold mt-1 flex items-center gap-1", currentStyle.roleColor)}>
                    <User size={10} /> {stage.metadata.role}
                  </p>

                  {/* Plain Language Description */}
                  <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-2.5 leading-relaxed">
                    {stage.metadata.description}
                  </p>
                </div>

                {/* Footer details */}
                <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800/80 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-surface-500 flex items-center gap-1">
                    <Clock size={10} /> {stage.durationDays} Days
                  </span>
                  <span className="text-surface-700 dark:text-surface-300 font-mono">
                    {formatDateLabel(stage.startDate)} - {formatDateLabel(stage.endDate)}
                  </span>
                </div>
              </motion.div>
              
              {/* Connected Arrow Indicator between milestones */}
              {!isLast && (
                <div className="flex items-center justify-center flex-shrink-0 text-surface-200 dark:text-surface-800">
                  <ChevronRight size={18} className="stroke-[3]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Summary Strip */}
      <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-surface-400 font-medium">
          💡 <span className="font-bold text-surface-500">Quick Tip:</span> Scroll horizontally to see all milestones. Enable or disable stages above to customize.
        </div>

        <div className="flex items-center gap-3 bg-surface-50 dark:bg-surface-800/30 border border-surface-150 dark:border-surface-800/80 px-4 py-2.5 rounded-2xl">
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-wider text-surface-400 block">Total Duration</span>
            <span className="text-sm font-black text-brand-600 dark:text-brand-400">
              {calculatedStages.reduce((sum, s) => sum + s.durationDays, 0)} Days
            </span>
          </div>
          <div className="h-6 w-px bg-surface-200 dark:bg-surface-700" />
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-wider text-surface-400 block">Est. Completion</span>
            <span className="text-sm font-black text-surface-800 dark:text-white">
              {formatDateLabel(calculatedStages[calculatedStages.length - 1].endDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

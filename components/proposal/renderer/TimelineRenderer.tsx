import React from "react";
import "./proposal-renderer.css";

interface TimelineMilestone {
  id: string;
  title: string;
  duration: string;
  deliverable: string;
}

interface TimelineContent {
  milestones?: TimelineMilestone[];
}

interface TimelineRendererProps {
  block: {
    title: string | null;
    content?: unknown;
  };
}

export function TimelineRenderer({ block }: TimelineRendererProps) {
  const content = (block.content as TimelineContent) || {};
  const milestones = Array.isArray(content.milestones) ? content.milestones : [];

  if (milestones.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold text-gray-900 mb-12 border-b pb-4">{block.title || "Project Timeline & Milestones"}</h2>
      
      <div className="relative border-l-2 border-blue-200 ml-4 space-y-10">
        {milestones.map((milestone, idx) => (
          <div key={milestone.id} className="relative pl-8 break-inside-avoid">
            {/* Timeline dot */}
            <div className="absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 border-4 border-white">
              <span className="text-xs font-bold text-blue-700">{idx + 1}</span>
            </div>
            
            <div className="bg-gray-50 border rounded-lg p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{milestone.title}</h3>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mt-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estimated Duration</p>
                  <p className="text-sm font-medium text-gray-800">{milestone.duration}</p>
                </div>
                
                <div className="space-y-1 flex-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Key Deliverables / Outcome</p>
                  <p className="text-sm font-medium text-gray-800">{milestone.deliverable}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

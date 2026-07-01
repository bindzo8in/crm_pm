import React from "react";
import "./proposal-renderer.css";

interface CoverBlockContent {
  subtitle?: string;
  preparedFor?: string;
  preparedBy?: string;
  date?: string;
  layoutStyle?: "MODERN" | "CLASSIC" | "MINIMAL";
}

interface CoverRendererProps {
  block: {
    content?: unknown;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposal: any; // Accept full proposal object
}

export function CoverRenderer({ block, proposal }: CoverRendererProps) {
  const content = (block.content as CoverBlockContent) || {};
  const {
    subtitle = "Commercial & Technical Proposal",
    preparedFor = proposal.customerCompanyName || proposal.customerDisplayName || "Client",
    preparedBy = proposal.preparedByName || "Sales Executive",
    date = new Date(proposal.createdAt || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
    layoutStyle = "MODERN",
  } = content;

  // Render different layouts based on layoutStyle
  if (layoutStyle === "MINIMAL") {
    return (
      <div className="proposal-page-content flex flex-col justify-center items-center text-center proposal-page-break-always">
        <div className="flex-1 flex flex-col justify-center items-center w-full max-w-2xl mx-auto space-y-16">
          <div className="space-y-6">
            <h1 className="text-5xl font-light tracking-tight text-gray-900">{proposal.title}</h1>
            <h2 className="text-xl font-medium text-gray-500 uppercase tracking-widest">{subtitle}</h2>
          </div>
          
          <div className="space-y-12 w-full pt-16 border-t border-gray-200">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Prepared For</p>
              <p className="text-2xl font-semibold text-gray-800">{preparedFor}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Prepared By</p>
              <p className="text-xl font-medium text-gray-700">{preparedBy}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-16 pb-8 flex flex-col items-center gap-1">
          <p className="text-sm text-gray-500">{date}</p>
          {proposal.validUntil && (
            <p className="text-xs text-gray-400">Valid Until: {new Date(proposal.validUntil).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          )}
        </div>
      </div>
    );
  }

  if (layoutStyle === "CLASSIC") {
    return (
      <div className="proposal-page-content proposal-cover-classic flex flex-col proposal-page-break-always">
        <div className="mt-16 mb-24 border-b-4 border-blue-900 pb-12">
          <h1 className="text-5xl font-serif font-bold text-blue-950 mb-6">{proposal.title}</h1>
          <h2 className="text-2xl font-medium text-gray-600">{subtitle}</h2>
        </div>
        
        <div className="flex-1 grid grid-cols-2 gap-16 mt-12">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest border-b border-gray-300 pb-2">Submitted To</h3>
            <p className="text-2xl font-semibold text-gray-900 pt-2">{preparedFor}</p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest border-b border-gray-300 pb-2">Submitted By</h3>
            <p className="text-xl font-medium text-gray-800 pt-2">{preparedBy}</p>
          </div>
        </div>
        
        <div className="mt-auto pt-16 flex flex-col gap-1">
          <p className="text-base font-medium text-gray-600">Date of Submission: {date}</p>
          {proposal.validUntil && (
            <p className="text-sm text-gray-500">Valid Until: {new Date(proposal.validUntil).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          )}
        </div>
      </div>
    );
  }

  // Default to MODERN
  return (
    <div className="proposal-page-content proposal-cover-modern flex flex-col proposal-page-break-always">
      <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
      
      <div className="flex-1 flex flex-col justify-center max-w-3xl">
        <div className="w-16 h-2 bg-blue-600 mb-8 rounded-full"></div>
        <h1 className="text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
          {proposal.title}
        </h1>
        <h2 className="text-2xl font-medium text-blue-600 mb-24">{subtitle}</h2>
        
        <div className="grid grid-cols-2 gap-12 mt-12 bg-white/60 p-8 rounded-2xl backdrop-blur-sm border border-white/40 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prepared For</p>
            <p className="text-xl font-bold text-gray-900">{preparedFor}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prepared By</p>
            <p className="text-xl font-semibold text-gray-800">{preparedBy}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-12 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-500">{date}</p>
          {proposal.validUntil && (
            <p className="text-xs font-medium text-gray-400">Valid Until: {new Date(proposal.validUntil).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          )}
        </div>
        <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center">
          <div className="w-12 h-12 bg-blue-600/20 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

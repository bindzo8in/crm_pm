import React from "react";
import "./proposal-renderer.css";
import { User, Calendar, Clock, Target, BarChart3, Users, ShieldCheck, Award, Phone, Mail, Globe, MapPin } from "lucide-react";

interface CoverBlockContent {
  subtitle?: string;
  preparedFor?: string;
  preparedBy?: string;
  date?: string;
  layoutStyle?: "MODERN" | "CLASSIC" | "MINIMAL";
  showProposalTitle?: boolean;
  showNotes?: boolean;
}

interface CoverRendererProps {
  block: {
    content?: unknown;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposal: any; // Accept full proposal object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  company?: any;
}

export function CoverRenderer({ block, proposal, company }: CoverRendererProps) {
  const content = (block.content as CoverBlockContent) || {};
  console.log(proposal)
  const {
    subtitle = "Smart Solutions. Strategic Thinking. Measurable Results.",
    preparedFor = proposal.customerCompanyName || proposal.customerDisplayName || "Client",
    preparedBy = proposal.preparedByName || "Sales Executive",
    date = new Date(proposal.createdAt || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" }),
    layoutStyle = "MODERN",
    showProposalTitle = true,
    showNotes = true,
  } = content;

  const validUntilDate = proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" }) : null;

  const proposalNumber = `QUOT-${proposal.proposalNumber || '1'}`;

  // Render different layouts based on layoutStyle
  if (layoutStyle === "MINIMAL") {
    return (
      <div className="proposal-page-content flex flex-col justify-center items-center text-center proposal-page-break-always">
        <div className="flex-1 flex flex-col justify-center items-center w-full max-w-2xl mx-auto space-y-16">
          {(showProposalTitle || showNotes) && (
            <div className="space-y-6">
              {showProposalTitle && <h1 className="text-5xl font-bold tracking-tight text-black">{proposal.title}</h1>}
              {showNotes && <h2 className="text-xl font-semibold text-black uppercase tracking-widest">{subtitle}</h2>}
            </div>
          )}
          
          <div className="space-y-12 w-full pt-16 border-t border-black/20">
            <div className="space-y-2">
              <p className="text-sm font-bold text-black uppercase tracking-wider">Prepared For</p>
              <p className="text-2xl font-black text-black">{preparedFor}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-bold text-black uppercase tracking-wider">Prepared By</p>
              <p className="text-xl font-bold text-black">{preparedBy}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-16 pb-8 flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-black">{date}</p>
          {proposal.validUntil && (
            <p className="text-xs font-medium text-black">Valid Until: {new Date(proposal.validUntil).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          )}
        </div>
      </div>
    );
  }

  if (layoutStyle === "CLASSIC") {
    return (
      <div className="proposal-page-content proposal-cover-classic flex flex-col proposal-page-break-always">
        {(showProposalTitle || showNotes) && (
          <div className="mt-16 mb-24 border-b-4 border-black pb-12">
            {showProposalTitle && <h1 className="text-5xl font-serif font-black text-black mb-6">{proposal.title}</h1>}
            {showNotes && <h2 className="text-2xl font-bold text-black">{subtitle}</h2>}
          </div>
        )}
        
        <div className="flex-1 grid grid-cols-2 gap-16 mt-12">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest border-b border-black/20 pb-2">Submitted To</h3>
            <p className="text-2xl font-black text-black pt-2">{preparedFor}</p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest border-b border-black/20 pb-2">Submitted By</h3>
            <p className="text-xl font-bold text-black pt-2">{preparedBy}</p>
          </div>
        </div>
        
        <div className="mt-auto pt-16 flex flex-col gap-1">
          <p className="text-base font-semibold text-black">Date of Submission: {date}</p>
          {proposal.validUntil && (
            <p className="text-sm font-medium text-black">Valid Until: {new Date(proposal.validUntil).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          )}
        </div>
      </div>
    );
  }

  // MODERN (New Custom Layout)
  return (
    <div className="proposal-page-content p-0 relative flex flex-col w-full min-h-[297mm] h-full bg-slate-50 overflow-hidden proposal-page-break-always font-sans">
      
      {/* Dynamic Background Layout */}
      <div className="absolute top-0 left-0 w-full h-[55%] z-0">
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1555529733-0e670560f7e1?q=80&w=1200&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Elegant Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-50" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col h-full w-full flex-1 pt-12 px-12">
        
        {/* Header - Company Info */}
        <div className="flex justify-between items-start w-full mb-12">
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-xl">
            {company?.logo?.url ? (
              <img src={company.logo.url} alt="Logo" className="h-14 w-14 object-contain brightness-0 invert" />
            ) : (
              <div className="w-12 h-12 bg-[#D4AF37] flex items-center justify-center text-white font-bold text-2xl rounded-lg shadow-lg">
                {company?.displayName?.charAt(0) || "C"}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-widest uppercase shadow-sm">{company?.displayName || "COMPANY"}</span>
            </div>
          </div>

          <div className="text-right flex flex-col bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-xl">
            <span className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-1">Proposal Reference</span>
            <span className="text-base font-bold text-white tracking-wider">{proposalNumber}</span>
          </div>
        </div>

        {/* Title Section */}
        {(showProposalTitle || showNotes) && (
          <div className="mt-4 mb-8 flex flex-col">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-1 bg-[#D4AF37]"></div>
              <span className="text-white font-semibold tracking-[0.2em] uppercase text-sm">Strategic Proposal</span>
            </div>
            {showProposalTitle && (
              <h1 className="text-5xl font-black text-white leading-tight tracking-tight mb-4 drop-shadow-md">
                {proposal.title || "DIGITAL SUCCESS"}
              </h1>
            )}
            {showNotes && (
              <p className="text-lg text-white font-medium leading-relaxed max-w-2xl drop-shadow">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Details Card Overlaying Background Transition */}
        <div className="bg-white rounded-2xl shadow-2xl border border-black/10 p-8 flex w-full max-w-3xl mt-auto mb-10 z-20 mx-auto text-sm">
          
          <div className="flex-1 pr-6 border-r border-black/10">
            <h3 className="text-[10px] font-bold text-black uppercase tracking-widest mb-4">Prepared For</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-black" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black text-black mb-1 leading-tight">{preparedFor}</span>
                
                {/* Contact Info */}
                {(proposal.customer?.primaryContactEmail || proposal.customer?.primaryContactPhone) && (
                  <div className="mb-2">
                    {proposal.customer?.primaryContactEmail && (
                      <div className="text-xs font-semibold text-black truncate max-w-[200px]" title={proposal.customer.primaryContactEmail}>
                        {proposal.customer.primaryContactEmail}
                      </div>
                    )}
                    {proposal.customer?.primaryContactPhone && (
                      <div className="text-xs font-semibold text-black">
                        {proposal.customer.primaryContactPhone}
                      </div>
                    )}
                  </div>
                )}

                {/* Address & GSTIN */}
                {proposal.customer && (
                  <div className="text-xs font-semibold text-black flex flex-col mt-1 space-y-0.5">
                    {proposal.customer.addressLine1 && <span>{proposal.customer.addressLine1}</span>}
                    {proposal.customer.addressLine2 && <span>{proposal.customer.addressLine2}</span>}
                    {proposal.customer.city && (
                      <span>
                        {[proposal.customer.city, proposal.customer.state, proposal.customer.postalCode].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {proposal.customer.country && <span>{proposal.customer.country}</span>}
                    {proposal.customer.gstNumber && (
                      <span className="font-bold text-black mt-1 uppercase">GSTIN: {proposal.customer.gstNumber}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 px-6 border-r border-black/10">
             <h3 className="text-[10px] font-bold text-black uppercase tracking-widest mb-4">Prepared By</h3>
             <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-black" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black text-black mb-1">{preparedBy}</span>
                <span className="text-xs font-bold text-black">{company?.displayName || "Our Company"}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 pl-6 flex flex-col justify-center gap-4">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-black/20">
                 <Calendar className="w-3 h-3 text-black" />
               </div>
               <div className="flex flex-col">
                 <span className="text-[9px] font-bold text-black uppercase tracking-wider">Date</span>
                 <span className="text-xs font-black text-black">{date}</span>
               </div>
             </div>
             
             {validUntilDate && (
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center border border-black/20">
                   <Clock className="w-3 h-3 text-black" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[9px] font-bold text-black uppercase tracking-wider">Valid Until</span>
                   <span className="text-xs font-black text-black">{validUntilDate}</span>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Footer Area */}
        <div className="w-full bg-[#0B1B3D] rounded-t-2xl text-white py-6 px-10 grid grid-cols-2 gap-8 shadow-2xl relative z-20 mx-auto border-t-4 border-[#D4AF37]">
          
          <div className="flex flex-col gap-3 justify-center">
            <div className="flex items-center gap-3">
              <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-xs font-medium tracking-wide text-slate-200">{company?.phone || "+91 12345 67890"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-xs font-medium tracking-wide text-slate-200">{company?.email || "info@example.com"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-xs font-medium tracking-wide text-slate-200">{company?.website?.replace(/^https?:\/\//, '') || "www.example.com"}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-4 justify-end text-right border-l border-white/10 pl-8">
            <div className="flex flex-col gap-1.5 items-end max-w-[260px]">
              <span className="text-[#D4AF37] font-bold tracking-widest uppercase text-[10px]">Headquarters</span>
              <span className="leading-relaxed text-xs font-medium text-slate-300">
                {[company?.address, company?.city, company?.postalCode].filter(Boolean).join(", ") || "123 Business Tower, Connaught Place, New Delhi"}
              </span>
            </div>
            <MapPin className="w-5 h-5 text-[#D4AF37] shrink-0" />
          </div>

        </div>

      </div>
    </div>
  );
}

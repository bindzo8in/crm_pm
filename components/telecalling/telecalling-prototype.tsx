"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  AudioLines,
  CalendarClock,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Headphones,
  ListFilter,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

type Lead = {
  id: string;
  name: string;
  initials: string;
  role: string;
  company: string;
  phone: string;
  stage: string;
  source: string;
  due: string;
  priority: "High" | "Normal";
  need: string;
};

type WorkspaceTab = "today" | "leads" | "insights";
type PreviewScreen = "workspace" | "lead" | "consent" | "call" | "review";

const leads: Lead[] = [
  {
    id: "lead-1",
    name: "Mira Shah",
    initials: "MS",
    role: "Founder",
    company: "Northstar Living",
    phone: "+91 98765 43210",
    stage: "Proposal sent",
    source: "Website",
    due: "Due now",
    priority: "High",
    need: "A launch campaign for a new residential project",
  },
  {
    id: "lead-2",
    name: "Arjun Mehta",
    initials: "AM",
    role: "Marketing lead",
    company: "Fieldnotes Studio",
    phone: "+91 98220 11442",
    stage: "Qualified",
    source: "Referral",
    due: "In 20 min",
    priority: "Normal",
    need: "Monthly content and social media management",
  },
  {
    id: "lead-3",
    name: "Nisha Rao",
    initials: "NR",
    role: "Director",
    company: "Good Earth Foods",
    phone: "+91 98450 23816",
    stage: "New lead",
    source: "Instagram",
    due: "Today, 3:30 pm",
    priority: "Normal",
    need: "A refreshed ecommerce site and product photography",
  },
];

const tabs: { id: WorkspaceTab; label: string; icon: typeof Clock3 }[] = [
  { id: "today", label: "Today", icon: Clock3 },
  { id: "leads", label: "Leads", icon: UsersRound },
  { id: "insights", label: "Insights", icon: AudioLines },
];

function initialsColor(leadId: string) {
  return leadId === "lead-1"
    ? "bg-[#d9efe5] text-[#176347]"
    : leadId === "lead-2"
      ? "bg-[#e7e8f7] text-[#484a85]"
      : "bg-[#f6e8cd] text-[#875c16]";
}

export function TelecallingPrototype() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("today");
  const [screen, setScreen] = useState<PreviewScreen>("workspace");
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0].id);
  const [search, setSearch] = useState("");
  const [followUpSaved, setFollowUpSaved] = useState(false);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0];
  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.company, lead.stage, lead.need]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search]);

  function openLead(leadId: string) {
    setSelectedLeadId(leadId);
    setFollowUpSaved(false);
    setScreen("lead");
  }

  function startCall(leadId = selectedLeadId) {
    setSelectedLeadId(leadId);
    setFollowUpSaved(false);
    setScreen("consent");
  }

  function returnToWorkspace(tab = activeTab) {
    setActiveTab(tab);
    setScreen("workspace");
  }

  return (
    <main className="min-h-svh bg-[#f2f6f3] pb-8 text-[#18332e] dark:bg-[#101b19] dark:text-[#edf5f0]">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-7 sm:pt-7 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#dce7e0] pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#164a3c] text-white">
              <Phone aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Signal Desk</p>
              <p className="text-xs text-[#647b71] dark:text-[#a4b9ae]">Sales workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#647b71] dark:text-[#a4b9ae] sm:inline">
              Asha · Sales
            </span>
            <div aria-label="Asha's profile" className="flex size-9 items-center justify-center rounded-full bg-[#dbe9df] text-xs font-semibold text-[#285c48] dark:bg-[#29463a] dark:text-[#d3eee0]">
              AS
            </div>
          </div>
        </header>

        {screen === "workspace" && (
          <Workspace
            activeTab={activeTab}
            filteredLeads={filteredLeads}
            search={search}
            onSearch={setSearch}
            onTabChange={setActiveTab}
            onOpenLead={openLead}
            onStartCall={startCall}
          />
        )}

        {screen === "lead" && (
          <LeadProfile
            lead={selectedLead}
            onBack={() => returnToWorkspace("leads")}
            onStartCall={() => startCall(selectedLead.id)}
          />
        )}

        {screen === "consent" && (
          <ConsentPreview
            lead={selectedLead}
            onBack={() => setScreen("lead")}
            onConfirm={() => setScreen("call")}
            onDecline={() => setScreen("lead")}
          />
        )}

        {screen === "call" && (
          <CallPreview lead={selectedLead} onFinish={() => setScreen("review")} />
        )}

        {screen === "review" && (
          <CallReview
            lead={selectedLead}
            followUpSaved={followUpSaved}
            onBack={() => setScreen("lead")}
            onSaveFollowUp={() => setFollowUpSaved(true)}
            onDone={() => returnToWorkspace("today")}
          />
        )}
      </div>
    </main>
  );
}

function Workspace({
  activeTab,
  filteredLeads,
  search,
  onSearch,
  onTabChange,
  onOpenLead,
  onStartCall,
}: {
  activeTab: WorkspaceTab;
  filteredLeads: Lead[];
  search: string;
  onSearch: (value: string) => void;
  onTabChange: (tab: WorkspaceTab) => void;
  onOpenLead: (leadId: string) => void;
  onStartCall: (leadId?: string) => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-5 py-7 sm:flex-row sm:items-end sm:justify-between sm:py-9">
        <div>
          <p className="text-sm text-[#647b71] dark:text-[#a4b9ae]">Monday, 10 November</p>
          <h1 className="mt-1 text-[2rem] font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
            Good morning, Asha
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#647b71] dark:text-[#a4b9ae]">
            Pick up where your conversations left off.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onStartCall(filteredLeads[0]?.id)}
          disabled={filteredLeads.length === 0}
          className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-xl bg-[#147756] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0e6347] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147756] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <Phone aria-hidden="true" className="size-4" />
          Call next lead
        </button>
      </section>

      <nav aria-label="Telecalling workspace" className="flex gap-1 border-b border-[#dce7e0] dark:border-white/10">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => onTabChange(id)}
            className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147756] ${
              activeTab === id
                ? "border-[#147756] text-[#15543e] dark:text-[#8de0b7]"
                : "border-transparent text-[#70847b] hover:text-[#18332e] dark:text-[#a4b9ae] dark:hover:text-white"
            }`}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.8fr)] lg:gap-12">
        <section>
          {activeTab === "today" && (
            <TodayQueue
              leads={filteredLeads}
              onOpenLead={onOpenLead}
              onStartCall={onStartCall}
            />
          )}
          {activeTab === "leads" && (
            <LeadList
              leads={filteredLeads}
              search={search}
              onSearch={onSearch}
              onOpenLead={onOpenLead}
              onStartCall={onStartCall}
            />
          )}
          {activeTab === "insights" && <Insights />}
        </section>

        <aside className="space-y-5 lg:pt-1">
          <TodaySnapshot />
          <PrivacyNote />
        </aside>
      </div>
    </>
  );
}

function TodayQueue({
  leads: visibleLeads,
  onOpenLead,
  onStartCall,
}: {
  leads: Lead[];
  onOpenLead: (leadId: string) => void;
  onStartCall: (leadId?: string) => void;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Your next calls</h2>
          <p className="mt-1 text-sm text-[#70847b] dark:text-[#a4b9ae]">3 conversations need a follow-up</p>
        </div>
        <span className="text-xs font-medium text-[#70847b] dark:text-[#a4b9ae]">Today</span>
      </div>
      <div className="mt-5 divide-y divide-[#dce7e0] border-y border-[#dce7e0] dark:divide-white/10 dark:border-white/10">
        {visibleLeads.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            onOpen={() => onOpenLead(lead.id)}
            onCall={() => onStartCall(lead.id)}
          />
        ))}
        {visibleLeads.length === 0 && <EmptyLeads />}
      </div>
    </>
  );
}

function LeadList({
  leads: visibleLeads,
  search,
  onSearch,
  onOpenLead,
  onStartCall,
}: {
  leads: Lead[];
  search: string;
  onSearch: (value: string) => void;
  onOpenLead: (leadId: string) => void;
  onStartCall: (leadId?: string) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Assigned leads</h2>
          <p className="mt-1 text-sm text-[#70847b] dark:text-[#a4b9ae]">Keep the next step close to the conversation.</p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#dce7e0] px-3 text-xs font-medium text-[#526c61] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147756] dark:border-white/15 dark:text-[#c0d0c7] dark:hover:bg-white/5"
        >
          <ListFilter aria-hidden="true" className="size-3.5" />
          Filters
        </button>
      </div>
      <label className="mt-5 flex min-h-11 items-center gap-2 rounded-xl border border-[#dce7e0] bg-white px-3 text-[#70847b] focus-within:ring-2 focus-within:ring-[#147756]/30 dark:border-white/10 dark:bg-[#182522] dark:text-[#a4b9ae]">
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="sr-only">Search leads</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search a name, company, or need"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#18332e] outline-none placeholder:text-[#94a49c] dark:text-white"
        />
      </label>
      <div className="mt-4 divide-y divide-[#dce7e0] border-y border-[#dce7e0] dark:divide-white/10 dark:border-white/10">
        {visibleLeads.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            onOpen={() => onOpenLead(lead.id)}
            onCall={() => onStartCall(lead.id)}
          />
        ))}
        {visibleLeads.length === 0 && <EmptyLeads />}
      </div>
    </>
  );
}

function LeadRow({
  lead,
  onOpen,
  onCall,
}: {
  lead: Lead;
  onOpen: () => void;
  onCall: () => void;
}) {
  return (
    <article className="flex items-center gap-3 py-4 sm:gap-4">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${initialsColor(lead.id)}`}>
        {lead.initials}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[#147756]"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold">{lead.name}</span>
          {lead.priority === "High" && (
            <span className="rounded-full bg-[#fbefda] px-2 py-0.5 text-[10px] font-semibold text-[#885d17] dark:bg-[#4b3b20] dark:text-[#f1c979]">
              Priority
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-xs text-[#70847b] dark:text-[#a4b9ae]">
          {lead.company} · {lead.stage}
        </span>
      </button>
      <span className="hidden min-w-20 text-right text-xs text-[#70847b] dark:text-[#a4b9ae] sm:block">
        {lead.due}
      </span>
      <button
        type="button"
        onClick={onCall}
        aria-label={`Preview call flow for ${lead.name}`}
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#cfe0d5] text-[#147756] transition-colors hover:bg-[#e2f1e8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147756] dark:border-white/15 dark:text-[#8de0b7] dark:hover:bg-white/5"
      >
        <Phone aria-hidden="true" className="size-4" />
      </button>
    </article>
  );
}

function EmptyLeads() {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-medium">No leads match this search</p>
      <p className="mt-1 text-xs text-[#70847b] dark:text-[#a4b9ae]">Try a different name or company.</p>
    </div>
  );
}

function TodaySnapshot() {
  return (
    <section aria-labelledby="snapshot-title" className="border-t-2 border-[#173e33] pt-4 dark:border-[#7ccca1]">
      <div className="flex items-baseline justify-between">
        <h2 id="snapshot-title" className="text-sm font-semibold">Your day</h2>
        <span className="text-xs text-[#70847b] dark:text-[#a4b9ae]">Live preview</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight">08</p>
          <p className="mt-1 text-[11px] leading-4 text-[#70847b] dark:text-[#a4b9ae]">Calls<br />planned</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">03</p>
          <p className="mt-1 text-[11px] leading-4 text-[#70847b] dark:text-[#a4b9ae]">Follow-ups<br />due</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">02</p>
          <p className="mt-1 text-[11px] leading-4 text-[#70847b] dark:text-[#a4b9ae]">Replies<br />waiting</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#dce7e0] pt-3 text-xs dark:border-white/10">
        <span className="text-[#70847b] dark:text-[#a4b9ae]">Call progress</span>
        <span className="font-medium">5 of 8</span>
      </div>
      <div
        role="progressbar"
        aria-label="Call progress"
        aria-valuemin={0}
        aria-valuemax={8}
        aria-valuenow={5}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dce7e0] dark:bg-white/10"
      >
        <div className="h-full w-[62.5%] rounded-full bg-[#1a9069]" />
      </div>
    </section>
  );
}

function PrivacyNote() {
  return (
    <section className="flex gap-3 rounded-xl bg-[#e6f0e9] p-4 dark:bg-[#1b3028]">
      <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#28704f] dark:text-[#8de0b7]" />
      <div>
        <h2 className="text-xs font-semibold">Respect every conversation</h2>
        <p className="mt-1 text-xs leading-5 text-[#5d7569] dark:text-[#b4c9bd]">
          Ask before recording. A customer can always choose not to be recorded.
        </p>
      </div>
    </section>
  );
}

function LeadProfile({
  lead,
  onBack,
  onStartCall,
}: {
  lead: Lead;
  onBack: () => void;
  onStartCall: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl py-7 sm:py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-[#60786c] hover:bg-white focus-visible:outline-2 focus-visible:outline-[#147756] dark:text-[#b4c9bd] dark:hover:bg-white/5"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to leads
      </button>
      <div className="mt-5 flex flex-col gap-5 border-b border-[#dce7e0] pb-6 sm:flex-row sm:items-center dark:border-white/10">
        <div className={`flex size-16 items-center justify-center rounded-2xl text-lg font-semibold ${initialsColor(lead.id)}`}>
          {lead.initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#70847b] dark:text-[#a4b9ae]">{lead.company}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{lead.name}</h1>
          <p className="mt-1 text-sm text-[#70847b] dark:text-[#a4b9ae]">{lead.role} · {lead.stage}</p>
        </div>
        <button
          type="button"
          onClick={onStartCall}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#147756] px-5 text-sm font-semibold text-white hover:bg-[#0e6347] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147756]"
        >
          <Phone aria-hidden="true" className="size-4" />
          Call {lead.name.split(" ")[0]}
        </button>
      </div>
      <div className="grid gap-8 pt-7 sm:grid-cols-[1fr_0.85fr]">
        <div>
          <h2 className="text-sm font-semibold">What they are looking for</h2>
          <p className="mt-3 text-sm leading-6 text-[#526c61] dark:text-[#c0d0c7]">{lead.need}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#dce7e0] px-3 py-1.5 text-xs text-[#60786c] dark:border-white/15 dark:text-[#c0d0c7]">{lead.source} lead</span>
            <span className="rounded-full border border-[#dce7e0] px-3 py-1.5 text-xs text-[#60786c] dark:border-white/15 dark:text-[#c0d0c7]">{lead.due}</span>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Contact and history</h2>
          <a
            href={`tel:${lead.phone.replaceAll(" ", "")}`}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce7e0] px-3 text-sm text-[#315d49] focus-visible:outline-2 focus-visible:outline-[#147756] dark:border-white/15 dark:text-[#bfe9d0]"
          >
            <Phone aria-hidden="true" className="size-4" />
            {lead.phone}
          </a>
          <div className="mt-5 border-l border-[#d5e4d9] pl-4 dark:border-white/15">
            <p className="text-xs font-medium">Yesterday · Proposal shared</p>
            <p className="mt-1 text-xs leading-5 text-[#70847b] dark:text-[#a4b9ae]">Follow up about the launch schedule and answer open questions.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ConsentPreview({
  lead,
  onBack,
  onConfirm,
  onDecline,
}: {
  lead: Lead;
  onBack: () => void;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  return (
    <section className="mx-auto max-w-xl py-7 sm:py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-[#60786c] hover:bg-white focus-visible:outline-2 focus-visible:outline-[#147756] dark:text-[#b4c9bd] dark:hover:bg-white/5"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to lead
      </button>
      <div className="mt-6 rounded-2xl border border-[#dce7e0] bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-[#182522]">
        <div className="flex size-11 items-center justify-center rounded-xl bg-[#e6f0e9] text-[#28704f] dark:bg-[#29463a] dark:text-[#8de0b7]">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </div>
        <p className="mt-5 text-xs font-medium text-[#70847b] dark:text-[#a4b9ae]">Before the call</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Ask about recording</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f766a] dark:text-[#b4c9bd]">
          Tell {lead.name.split(" ")[0]} why the call may be recorded and how it will be used. Follow your approved notice for this region.
        </p>
        <div className="mt-5 rounded-xl bg-[#f2f6f3] p-4 text-sm leading-6 text-[#526c61] dark:bg-[#21332d] dark:text-[#c0d0c7]">
          “Would you be comfortable with us recording this call so I can keep accurate notes and follow up on what we discuss?”
        </div>
        <div role="note" className="mt-4 flex gap-2 text-xs leading-5 text-[#70847b] dark:text-[#a4b9ae]">
          <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          If they say no, continue without recording where permitted. Do not select consent on their behalf.
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#147756] px-4 text-sm font-semibold text-white hover:bg-[#0e6347] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147756]"
          >
            <Check aria-hidden="true" className="size-4" />
            Preview consent given
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="min-h-12 rounded-xl border border-[#dce7e0] px-4 text-sm font-medium text-[#526c61] hover:bg-[#f2f6f3] focus-visible:outline-2 focus-visible:outline-[#147756] dark:border-white/15 dark:text-[#c0d0c7] dark:hover:bg-white/5"
          >
            Preview no recording
          </button>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-[#70847b] dark:text-[#a4b9ae]">
        Design preview only. Neither choice records or places a call.
      </p>
    </section>
  );
}

function CallPreview({ lead, onFinish }: { lead: Lead; onFinish: () => void }) {
  const waveform = [12, 21, 15, 28, 17, 34, 20, 42, 24, 33, 18, 38, 22, 30, 14, 26, 19, 35, 15, 24, 12, 30, 17, 39, 21, 31, 14, 25, 18, 36, 12, 28, 18, 32, 13, 23, 16, 34];

  return (
    <section className="mx-auto max-w-xl py-7 sm:py-10">
      <div className="rounded-2xl border border-[#dce7e0] bg-white p-5 text-center sm:p-8 dark:border-white/10 dark:bg-[#182522]">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f6f3] px-3 py-1.5 text-xs font-medium text-[#526c61] dark:bg-[#21332d] dark:text-[#c0d0c7]">
          <span className="size-2 rounded-full bg-[#d59b3c]" />
          Call flow preview
        </span>
        <div className="mx-auto mt-6 flex size-16 items-center justify-center rounded-full bg-[#e6f0e9] text-[#28704f] dark:bg-[#29463a] dark:text-[#8de0b7]">
          <Phone aria-hidden="true" className="size-6" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{lead.name}</h1>
        <p className="mt-1 text-sm text-[#70847b] dark:text-[#a4b9ae]">{lead.company}</p>
        <p className="mt-5 font-mono text-3xl tracking-tight">01:24</p>
        <div aria-label="Decorative audio waveform sample" className="mt-6 flex h-12 items-center justify-center gap-[3px]" role="img">
          {waveform.map((height, index) => (
            <span
              key={`${index}-${height}`}
              className={`w-1 rounded-full ${index < 13 ? "bg-[#29936d]" : "bg-[#d4e4da]"}`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#70847b] dark:text-[#a4b9ae]">
          This is a visual sample. No call is placed, and no microphone or recording is active.
        </p>
        <button
          type="button"
          onClick={onFinish}
          className="mt-6 min-h-12 w-full rounded-xl bg-[#173e33] px-4 text-sm font-semibold text-white hover:bg-[#0f3027] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147756] dark:bg-[#2f604b] dark:hover:bg-[#3b765c]"
        >
          Preview call summary
        </button>
      </div>
    </section>
  );
}

function CallReview({
  lead,
  followUpSaved,
  onBack,
  onSaveFollowUp,
  onDone,
}: {
  lead: Lead;
  followUpSaved: boolean;
  onBack: () => void;
  onSaveFollowUp: () => void;
  onDone: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl py-7 sm:py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-[#60786c] hover:bg-white focus-visible:outline-2 focus-visible:outline-[#147756] dark:text-[#b4c9bd] dark:hover:bg-white/5"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to lead
      </button>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#70847b] dark:text-[#a4b9ae]">Call with {lead.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Review the conversation</h1>
        </div>
        <span className="rounded-full border border-[#dce7e0] px-3 py-1.5 text-xs text-[#60786c] dark:border-white/15 dark:text-[#c0d0c7]">Sample analysis</span>
      </div>
      <section className="mt-6 border-t-2 border-[#173e33] pt-4 dark:border-[#7ccca1]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[#70847b] dark:text-[#a4b9ae]">Conversation signal · AI estimate</p>
            <p className="mt-1 text-lg font-semibold">Interested, with timing questions</p>
          </div>
          <span className="rounded-full bg-[#e6f0e9] px-3 py-1.5 text-xs font-medium text-[#28704f] dark:bg-[#29463a] dark:text-[#b2e8c9]">
            Medium confidence
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#70847b] dark:text-[#a4b9ae]">
          A tentative reading of language and delivery, not a fact about how the customer feels. Please review before saving.
        </p>
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-[#dce7e0] bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-[#182522]">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 text-[#21845f]" />
            <h2 className="text-sm font-semibold">Suggested summary</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#526c61] dark:text-[#c0d0c7]">
            {lead.name.split(" ")[0]} is interested in moving forward and asked about the launch timeline. Share a phased plan and confirm the preferred start date.
          </p>
          <blockquote className="mt-4 border-l-2 border-[#87b89a] pl-3 text-xs leading-5 text-[#70847b] dark:text-[#a4b9ae]">
            “Could you share a timeline for getting the first campaign live?”
            <cite className="mt-1 block not-italic">Transcript evidence · 00:42</cite>
          </blockquote>
          <button
            type="button"
            className="mt-4 min-h-9 rounded-lg border border-[#dce7e0] px-3 text-xs font-medium text-[#526c61] hover:bg-[#f2f6f3] focus-visible:outline-2 focus-visible:outline-[#147756] dark:border-white/15 dark:text-[#c0d0c7] dark:hover:bg-white/5"
          >
            Edit suggested summary
          </button>
        </section>

        <section className="rounded-xl border border-[#dce7e0] p-4 sm:p-5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <CalendarClock aria-hidden="true" className="size-4 text-[#21845f]" />
            <h2 className="text-sm font-semibold">Recommended next step</h2>
          </div>
          <p className="mt-3 text-sm leading-5">Send a phased launch timeline</p>
          <p className="mt-1 text-xs text-[#70847b] dark:text-[#a4b9ae]">Tomorrow · 11:00 am</p>
          <button
            type="button"
            onClick={onSaveFollowUp}
            disabled={followUpSaved}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#147756] px-3 text-xs font-semibold text-white hover:bg-[#0e6347] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147756] disabled:cursor-default disabled:bg-[#dce7e0] disabled:text-[#526c61] dark:disabled:bg-[#29463a] dark:disabled:text-[#b4c9bd]"
          >
            {followUpSaved ? <Check aria-hidden="true" className="size-4" /> : <CalendarClock aria-hidden="true" className="size-4" />}
            {followUpSaved ? "Saved in this preview" : "Save follow-up"}
          </button>
          <p className="mt-3 text-[11px] leading-4 text-[#70847b] dark:text-[#a4b9ae]">
            No data is sent or saved to the CRM in this prototype.
          </p>
        </section>
      </div>

      <details className="mt-6 rounded-xl border border-[#dce7e0] bg-white dark:border-white/10 dark:bg-[#182522]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#147756]">
          <Headphones aria-hidden="true" className="size-4 text-[#70847b]" />
          Sample transcript
          <span className="ml-auto text-xs font-normal text-[#70847b] dark:text-[#a4b9ae]">2 excerpts</span>
          <ChevronRight aria-hidden="true" className="size-4 text-[#70847b]" />
        </summary>
        <div className="space-y-4 border-t border-[#dce7e0] px-4 py-4 text-xs leading-5 dark:border-white/10">
          <p><span className="mr-2 text-[#70847b]">00:18</span><strong>{lead.name.split(" ")[0]}:</strong> We are hoping to begin the launch next month.</p>
          <p><span className="mr-2 text-[#70847b]">00:42</span><strong>{lead.name.split(" ")[0]}:</strong> Could you share a timeline for getting the first campaign live?</p>
        </div>
      </details>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 rounded-xl border border-[#dce7e0] px-4 text-sm font-medium text-[#526c61] hover:bg-white focus-visible:outline-2 focus-visible:outline-[#147756] dark:border-white/15 dark:text-[#c0d0c7] dark:hover:bg-white/5"
        >
          Finish review
        </button>
      </div>
    </section>
  );
}

function Insights() {
  const bars = [
    { day: "Mon", value: 5 },
    { day: "Tue", value: 7 },
    { day: "Wed", value: 4 },
    { day: "Thu", value: 8 },
    { day: "Fri", value: 6 },
  ];

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Conversation insights</h2>
        <p className="mt-1 text-sm text-[#70847b] dark:text-[#a4b9ae]">A view of activity, not a score for people.</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="border-t-2 border-[#173e33] pt-3 dark:border-[#7ccca1]">
          <p className="text-2xl font-semibold tracking-tight">34</p>
          <p className="mt-1 text-xs text-[#70847b] dark:text-[#a4b9ae]">Calls connected</p>
        </div>
        <div className="border-t-2 border-[#d59b3c] pt-3">
          <p className="text-2xl font-semibold tracking-tight">76%</p>
          <p className="mt-1 text-xs text-[#70847b] dark:text-[#a4b9ae]">Follow-ups on time</p>
        </div>
      </div>
      <section className="mt-7 border-y border-[#dce7e0] py-5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Calls connected</h3>
          <span className="text-xs text-[#70847b] dark:text-[#a4b9ae]">This week</span>
        </div>
        <div className="mt-5 flex h-28 items-end justify-between gap-3">
          {bars.map((bar) => (
            <div key={bar.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div
                aria-label={`${bar.value} calls on ${bar.day}`}
                className={`w-full max-w-10 rounded-t-md ${bar.day === "Thu" ? "bg-[#1a9069]" : "bg-[#b8d7c3]"}`}
                style={{ height: `${bar.value * 10}px` }}
                role="img"
              />
              <span className="text-[11px] text-[#70847b] dark:text-[#a4b9ae]">{bar.day}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-5 flex gap-3 rounded-xl bg-[#fbefda] p-4 text-[#785719] dark:bg-[#3c321f] dark:text-[#eed092]">
        <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p className="text-xs leading-5">
          AI conversation signals are optional, uncertain suggestions. They are not a measure of a customer&apos;s character or intent.
        </p>
      </div>
    </>
  );
}

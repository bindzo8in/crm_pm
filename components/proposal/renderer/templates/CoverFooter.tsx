import React from "react";
import { Phone, Globe, Mail, MapPin } from "lucide-react";

export function CoverFooter({ proposal, company, config }: { proposal?: any; company: any; config: any }) {
  if (!config.coverFooterEnabled) return null;

  // Render services - use config.services if available, else active services from DB, else static fallback
  const servicesList = Array.isArray(config.services) && config.services.length > 0
    ? config.services
    : (proposal?.activeServiceNames && proposal.activeServiceNames.length > 0)
      ? proposal.activeServiceNames
      : ["Branding", "Digital Marketing", "DV360", "Design Solution", "Website Development", "Mobile App Development", "Google Ads", "SEO", "Software Development"];

  return (
    <div className="w-full flex flex-col z-20 mt-auto">

      {/* Services Section */}
      {config.showServices && (
        <div className="w-full bg-white py-6 flex flex-col items-center">
          <div className="flex items-center w-full max-w-4xl mx-auto mb-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
              Core Services
            </span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <div className="max-w-4xl mx-auto px-8">
            <div className="flex flex-wrap justify-center items-center text-xs font-bold text-gray-800 leading-relaxed gap-y-1">
              {servicesList.map((service: string, index: number) => (
                <div key={index} className="flex items-center">
                  <span className="text-nowrap">{service}</span>
                  {index < servicesList.length - 1 && (
                    <span className="mx-2 text-blue-500">|</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact Strip Section */}
      {(config.showContacts || config.showAddress) && (
        <div
          className="w-full py-4 px-12 text-white flex flex-col justify-between items-center text-xs font-medium bg-[#222222]"
        >
          <div>
            {[company.displayName, company.address, company.city, company.postalCode, company.country].filter(Boolean).join(", ")}.
          </div>

          {/* Left: Phone & Website */}
          <div className="flex gap-2">
            {config.showContacts && company?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-3.5 h-3.5 opacity-70" />
                <span>
                  <a href={`tel:${company.phone}`} className="text-white! hover:text-white/70! no-underline!">{company.phone}</a>
                  {company.secondaryPhone && ` / `}
                  {company.secondaryPhone && <a href={`tel:${company.secondaryPhone}`} className="text-white! hover:text-white/70! no-underline!">{company.secondaryPhone}</a>}
                </span>
              </div>
            )}
            {config.showContacts && company?.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-3.5 h-3.5 opacity-70" />
                <span>{company.website.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
            {config.showContacts && company?.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-3.5 h-3.5 opacity-70" />
                <span>{company.email}</span>
              </div>
            )}
          </div>

          {/* Center: Email */}
          {/* <div className="flex flex-col gap-2 w-1/3 items-center text-center">
            {config.showContacts && company?.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-3.5 h-3.5 opacity-70" />
                <span>{company.email}</span>
              </div>
            )}
          </div> */}

          {/* Right: Address */}
          {/* <div className="flex flex-col gap-2 w-1/3 items-end">
            {config.showAddress && company?.address && (
              <div className="flex items-start gap-2 text-left max-w-[280px]">
                <MapPin className="w-3.5 h-3.5 opacity-70 shrink-0 mt-0.5" />
                <span className="leading-tight">
                  <span className="text-white/70">
                    {[company.displayName, company.address, company.city, company.postalCode, company.country].filter(Boolean).join(", ")}
                  </span>
                </span>
              </div>
            )}
          </div> */}
        </div>
      )}

    </div>
  );
}

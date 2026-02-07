import React from 'react';
import {
  Building2,
  GraduationCap,
  Globe,
  Landmark,
  ShoppingBag,
  Radio } from
'lucide-react';
const partners = [
{
  name: 'Museum Nasional',
  icon: Landmark
},
{
  name: 'Kementerian Pendidikan',
  icon: GraduationCap
},
{
  name: 'UNESCO Heritage',
  icon: Globe
},
{
  name: 'Bank Indonesia',
  icon: Building2
},
{
  name: 'Tokopedia',
  icon: ShoppingBag
},
{
  name: 'Telkom Indonesia',
  icon: Radio
}];

export function TrustedBy() {
  return (
    <section className="py-8 md:py-12 bg-theme-bg border-b border-theme-border overflow-hidden relative z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6 md:mb-8 text-center">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.15em] md:tracking-[0.2em] text-theme-muted">
          Trusted by Leading Institutions
        </p>
      </div>

      <div className="relative w-full overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-theme-bg to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-theme-bg to-transparent z-10" />

        <div className="flex w-max animate-marquee">
          <div className="flex gap-8 md:gap-16 px-4 md:px-8 items-center">
            {partners.map((partner, index) =>
            <div
              key={index}
              className="flex items-center gap-2 md:gap-3 opacity-50 cursor-default">

                <partner.icon className="w-4 h-4 md:w-6 md:h-6 text-theme-muted" />
                <span className="text-xs md:text-sm font-medium text-theme-muted whitespace-nowrap">
                  {partner.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-8 md:gap-16 px-4 md:px-8 items-center">
            {partners.map((partner, index) =>
            <div
              key={`dup-${index}`}
              className="flex items-center gap-2 md:gap-3 opacity-50 cursor-default">

                <partner.icon className="w-4 h-4 md:w-6 md:h-6 text-theme-muted" />
                <span className="text-xs md:text-sm font-medium text-theme-muted whitespace-nowrap">
                  {partner.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>);

}
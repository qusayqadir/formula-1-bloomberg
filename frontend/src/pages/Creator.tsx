/** Creator — deliberately empty page with only a footer block.
 *  ALL COPY BELOW IS PLACEHOLDER: swap the tagline, link columns, and
 *  contact details for your own. The footer keeps its own dark surface in
 *  both themes (a signature block, not a themed card). */
const LINK_COLUMNS: string[][] = [
  ["Mission", "How it works", "Pricing", "Analysis"],
  ["Questions", "Reviews", "Comparison", "Diseases"],
  ["Solution", "Book a call"],
];

export function Creator() {
  return (
    <div className="flex h-full flex-col">
      {/* intentionally empty — content to be added later */}
      <div className="flex-1" />

      <footer className="px-5 pb-6">
        <div className="rounded-2xl bg-[#0b0c0e] px-8 pb-8 pt-10 text-[#edeef0] md:px-12">
          <p className="text-[15px] font-semibold tracking-tight">F1 Terminal</p>

          <div className="mt-16 flex flex-col gap-10 md:mt-24 md:flex-row md:items-end md:justify-between">
            <div className="max-w-sm">
              <p className="font-serif text-[22px] leading-snug">
                Take Control of Your Pet&apos;s Health.
                <br />
                Love your pet for longer.
              </p>
              <button className="mt-5 rounded-full bg-[#e9efcf] px-4 py-2 text-xs font-medium text-[#16181d] transition-opacity hover:opacity-90">
                Get started
              </button>
            </div>

            <div className="flex flex-wrap gap-x-14 gap-y-6">
              {LINK_COLUMNS.map((col, i) => (
                <ul key={i} className="space-y-2.5 text-xs text-[#c6c9cd]">
                  {col.map((label) => (
                    <li key={label}>
                      <a href="#" className="transition-colors hover:text-white">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              ))}
            </div>

            <div className="text-xs leading-relaxed text-[#9ba1a8]">
              <a href="mailto:hello@hugohealth.com.au" className="underline decoration-[#4a4f56] underline-offset-2 hover:text-white">
                hello@hugohealth.com.au
              </a>
              <p className="mt-1">@hugo.petcare</p>
              <p>470 St Kilda Rd, Melbourne VIC 3004</p>
              <div className="mt-5 flex gap-6 text-[#767c85]">
                <a href="#" className="hover:text-white">Privacy Policy</a>
                <a href="#" className="hover:text-white">Terms &amp; Conditions</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

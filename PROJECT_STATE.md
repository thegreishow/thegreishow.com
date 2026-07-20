# The Grei Show Website - PROJECT STATE

## Phase 1 Status
**In Progress** - Foundation Architecture + Visual Polish + Performance + Arcade Polish + New Pages

## Recent Updates (July 18)
- Created and launched clean, professional **White Line** page (whiteline.html).
  - Strong hero with tagline and call-to-action.
  - Clear sections explaining Sound / Story / Signal.
  - Join / Early Access flow linking to Connect page.
  - Fully styled and responsive.
  - **Hidden from main navigation** (like admin.html and epk.html) for now.
- Major visual & movement polish pushed live to Signal Runner (stronger lean, trails, scrolling speed grid).
- Simplified reliable sound system in arcade (per-sound AudioContext for better iOS compatibility).

## Completed
- Basic folder structure established
- Reusable CSS base, layout, theme, and component layers started
- Shared cinematic background image now applied through the global base stylesheet
- Legacy layout defaults cleaned up so the shared navigation and page shells behave consistently
- Shared navigation rebuilt with readable markup, responsive styling, and active-page state
- Legacy header component aligned with current navigation
- Global navigation added to visual subpages
- Homepage rebuilt as a focused audience and revenue funnel for music, books, Bandcamp support, creative services, the arcade, and the release list
- Homepage media optimized from roughly 22 MB of JPEGs to lightweight WebP delivery while preserving the original source assets
- Shared navigation reprioritized around Music, Visuals, Books, Wheel It! Records, Shop, and Work with Grei, with an accessible mobile menu
- Booking and project inquiries consolidated into one Work with Grei destination, with legacy booking URLs preserved as redirects
- Connect page upgraded from competing mailto forms to one qualified inquiry covering bookings, services, timeline, budget, location, and goals
- Public token-based CMS form removed; content editing now routes to GitHub's authenticated editor without accepting credentials on the website
- Core page descriptions, canonical URLs, structured homepage data, robots rules, and a real XML sitemap added
- Conversion-ready event hooks added for page views, primary calls to action, purchases, and prepared inquiries
- Dependency-free static-site validation and GitHub Actions checks added for links, assets, titles, and unsafe credential fields
- Music page retitled to AUDIO UNIVERSE and cleaned of behind-the-scenes explanatory copy
- Visuals page retitled to VISUAL UNIVERSE with duplicate category links removed above the hero player
- Astral Thread moved under the new Books section as Book 01: The Astral Thread
- Books page rebuilt as a catalog-first storefront with genre-led title cards, a clear Buy Now action, an independent reader route, and a reserved Book 02 slot
- The Astral Thread now opens on its own reader page so future books can each have an independent reading experience
- Books reader chapter data now loads from assets/js/books-chapter-01.js through assets/js/books-chapter-20.js as the temporary working manuscript source
- Books reader migration is prepared to load only the active chapter's full narration once the local MP3 set is added
- Current temporary Astral Thread version added with 20 chapters from the latest supplied manuscript
- Chapters 01-20 have permanent local narration paths prepared, but the complete MP3 files still need to be generated
- Books audio override migration supplies one intended local full-narration path for every chapter
- Planned chapter narration opens with word-form chapter numbers so the voiceover does not read leading zeroes aloud
- Books reader migration removes the silent fallback to short preview clips when a full narration source fails
- Narration validation is prepared to block releases with missing, duplicate, temporary, or malformed Astral Thread audio files
- Books reader now supports visual chapter artwork with generated assets for all 20 Astral Thread chapters plus the Astral Thread cover fallback
- Books reader supports Previous / Next controls plus left and right arrow keys
- Books reader keeps the story title and chapter number on the left page while dedicating the right page to a larger scrolling story area
- Music Videos, Documentaries, and Live Sessions archives refreshed with shared page shells and media-card styling
- Wheel It! Records page refreshed with clickable producer-reel cards
- Connect, Merch, Photography, and Press pages refreshed to match the shared visual language
- Press portal added with artist profile, news, career timeline, media kit, and contact sections
- Photography image URLs moved to HTTPS
- Arcade registry path repaired
- Arcade lobby upgraded with search, filters, stats, and empty states
- Signal Runner playable arcade prototype added
- Arcade template game and thumbnail placeholders added

## Known Gaps
- Several pages still keep page-specific inline style blocks while the shared component layer matures
- Books chapter visuals now have a complete generated first pass across all 20 temporary Astral Thread chapters
- Books full narration still needs generation, normalization, file delivery, and a human pronunciation and pacing pass
- Press media kit download is still routed to the Connect page until real downloadable assets exist
- Project inquiries still use the visitor's email app until a hosted form or CRM endpoint is connected
- Direct payment links, a service deposit, and a real newsletter provider still require owner accounts and business settings
- Photography still depends on externally hosted images
- Arcade needs deeper per-game sound integration and leaderboard UI
- Photography still needs reliable site-owned image assets
- White Line page is live but intentionally hidden from main navigation for now

## Next
- Replace the temporary Astral Thread manuscript data when the official-official version is confirmed
- Generate, normalize, and add the 20 complete Astral Thread narration MP3s
- Re-audit or regenerate Books narration once the official-official manuscript is confirmed
- Refine Books / Astral Thread artwork in Canva or replace generated chapter art as the final manuscript settles
- Consolidate repeated inline page styles into shared component classes
- Add production-ready press photos and a downloadable media kit
- Connect a hosted service deposit or checkout, scheduling link, and email-list provider
- Connect an analytics provider to the existing dataLayer events and define conversion goals
- Add privacy, refund, and service terms before direct checkout launches
- Expand arcade with more playable experiences and stronger game-state systems
- Add structured content/data files for music, visuals, books, press, and arcade growth
- Add lightweight QA checks for broken links, missing assets, and page metadata
- Decide on public reveal strategy for White Line page when ready

Last Updated: July 20, 2026

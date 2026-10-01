# Agentic claims capture: same 64 companies, same instrument as the Outcomes study

Calidescope LLC. Capture run 2026-09-30. Counts describe the 64 companies and the pages read, not the market.

## Summary

- **Denominator.** 64 companies checked out of the 140-company frame: all 20 tagged "AI-native", all 20 "Outcome sellers (deep read)" (Liftoff and Moloco sit in both lists, so 38 unique), plus 26 from other segments.
- **Any agentic claim at all.** 35 of 64 (55%) had at least one codable agentic claim on the pages read. 6 (9%) showed only a label or headline ("Agentic Advertising" as a nav item or blog title). 23 (36%) showed nothing we could code. Only 25 of the 35 had the claim on the home page or the frame URL; the other 10 came from a press release, blog or product page.
- **By group.** AI-native 15 of 20. Outcome sellers 6 of 20. Other segments 14 of 26. Among the 20 outcome sellers, only Kochava uses agent vocabulary on its home page.
- **Autonomy split, 80 coded claims.** ASSISTS 46 (57%) / ACTS 34 (42%). 25 of the 46 ASSISTS codes are "ambiguous, so ASSISTS" under the no-guessing-upward rule. If the 7 "you set the guardrails, the agent acts" claims are recoded ASSISTS, the split is 53 / 27. ACTS claims sit mostly in the AI-native group (23 ACTS to 16 ASSISTS). The other-segment group is 22 ASSISTS to 3 ACTS.
- **Evidence rung, 80 coded claims.** Says it 65 (81%) / prints a figure 7 (9%) / names the advertiser 6 (8%) / shows the method 2 (2%) / cites an outsider 0 (0%). Outcomes study: 221 / 159 / 290 / 42 / 28 of 740 (30% / 21% / 39% / 6% / 4%). The agentic set is thinner at every rung above "says it".
- **Commitment.** Of the 80 coded claims, 0 mention a guarantee, a remedy, pricing tied to a result, or paying when a number is missed. We did not find, on the pages we read, any company promising an agent that commits to a number with a remedy. The one contract we read (PubMatic AgenticOS agreement) says the opposite.
- **Negotiation.** One company in the frame lists negotiating among agent activities: Apostra (formerly Scope3). The word is one item in a list of 20 verbs. Beside it: "You set the price and rules." Two more negotiation claims sit outside the frame (Universal Ads, R2B2). All three keep a human or a rule-set upstream.
- **Agents on outcomes.** We did not find an agent priced on a result. We found agents whose pitch is a result (Taboola Realize+, Tatari Planning Engine, Quantcast Q+, MNTN), and a holding company (Omnicom) that says outcome pricing is coming for people-based work. The two lists do not touch on any page we read.
- **Surprises.** (1) PubMatic's homepage says AI agents "plan, execute, and optimize media"; its own blog says execution and approval should be separate; its contract puts all risk of agent actions on the customer. (2) The only method-rung agentic claims come from a performance-TV company (Tatari), which describes its own four-week randomized A/B test. (3) Scope3 no longer exists under that name: scope3.com redirects to apostra.com after a September 2026 rebrand.

## How the instrument was applied

- **Claim.** A sentence or phrase asserting that an AI system acts, decides, executes, recommends or drafts for the user. Section headings and nav labels ("Agentic AI", "Agents at Adobe") were counted as *label only*, not as claims. 6 companies fall in that bucket.
- **Vocabulary flag.** 56 of the 80 claims use agent / agentic / autonomous / "human in the loop" language ("vocab = Y"). The other 24 say AI "automatically" finds, optimises or decides. Both are shown; totals use all 80 unless stated.
- **ACTS vs ASSISTS.** ACTS = the sentence says the agent does the thing (executes, optimises, buys, decides). ASSISTS = surfaces, recommends, drafts, summarises, or a human approves first. Operational rule for guardrails: "you set goals and guardrails, then the agent runs" is coded ACTS and flagged GRD (7 claims). "Agent proposes, you approve" is ASSISTS. Ambiguous claims are coded ASSISTS and flagged AMB (25 claims).
- **Rung.** Judged from what sits beside the claim on the same page or module. Homepage numbers with no source are rung 2. A named customer beside the claim is rung 3. A stated test design is rung 4. An outsider is someone who does not sell the thing; none sat beside a company-owned claim.
- **Register** is our coding, not the page's words.
- **Verbatim status.** Pages were read with WebFetch, which passes each page through a small extraction model. Every quote in the table is a string that model returned as verbatim. "B" in the verify column means a second, differently-worded fetch returned the same string. "A" means one fetch only. Treat "A" quotes as needing a spot check against the live page before publication. Page text can also differ between fetches (for example, some pages were mid-redirect).
- **MADDB.** news searches on agentic advertising, agents in media buying, agentic commerce, autonomous campaigns, agent-to-agent, negotiation, outcome pricing, guarantees and AdCP (about 20 queries; 5 hit a rate limit and were rerun; queries phrased as long sentences often returned zero). We did not pull company briefs. MADDB gave leads and context; every quoted claim in the table comes from a company or press URL.

## Claims table

Flags: AMB = ambiguous, coded ASSISTS. GRD = agent acts inside guardrails the user sets, coded ACTS. Commitment column: "no" means the claim and its surrounding module mention no guarantee, remedy, results-tied price, or payment on a missed number. Group: AIN = AI-native, OUT = outcome seller, SPR = other segment. "Page" is home / product / press (a press release, blog post or insights page on the company's own site or wire).

| # | company | grp | verbatim | url | page | autonomy | rung | commitment | register (ours) | vocab | verify | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 6sense | AIN | "AI Email Agents generate, send, and reply to emails grounded in real-time buyer signals and your brand voice" | https://6sense.com | home | ACTS | 1 says it | no | relief from drudgery | Y | A |  |
| 2 | 6sense | AIN | "AI Email Agents have saved us 1,098 hours, equivalent to seven months of BDR time." | https://6sense.com | home | ASSISTS | 3 names the advertiser | no | relief from drudgery | Y | A | AMB |
| 3 | Iterable | AIN | "Nova agents help teams build and optimize audiences, journeys, and campaigns faster, automating manual work so marketers can focus on strategy." | https://iterable.com | home | ASSISTS | 1 says it | no | relief from drudgery | Y | A |  |
| 4 | Iterable | AIN | "Nova continuously evaluates behavioral signals to determine the next best action while keeping teams in control of goals and guardrails." | https://iterable.com | home | ASSISTS | 1 says it | no | control and safety | Y | A | AMB |
| 5 | Jasper | AIN | "Purpose-built AI agents that execute real marketing work." | https://www.jasper.ai | home | ACTS | 1 says it | no | relief from drudgery | Y | A |  |
| 6 | Jasper | AIN | "Orchestrate intelligent agents to run end-to-end marketing workflows" | https://www.jasper.ai | home | ACTS | 1 says it | no | delegation, mastery | Y | A |  |
| 7 | Jasper | AIN | "60% of SEO now automated with Jasper" | https://www.jasper.ai | home | ACTS | 3 names the advertiser | no | efficiency | N | A |  |
| 8 | Jasper | AIN | "7,500 product descriptions written by Jasper in 24 hours" | https://www.jasper.ai | home | ASSISTS | 3 names the advertiser | no | speed | N | A | AMB |
| 9 | Klaviyo | AIN | "Customer Agent resolves 65% of questions autonomously." | https://www.klaviyo.com | home | ACTS | 2 prints a figure | no | relief from drudgery | Y | A |  |
| 10 | Klaviyo | AIN | "Composer audits your flows, segments, and forms, and creates an entire on-brand campaign to maximize your revenue." | https://www.klaviyo.com | home | ASSISTS | 1 says it | no | growth, ambition | N | A | AMB |
| 11 | Microsoft Advertising | AIN | "Copilot Checkout lets shoppers complete purchases directly inside Microsoft Copilot" | https://about.ads.microsoft.com/en/solutions/technology/agentic-commerce | product | ASSISTS | 1 says it | no | convenience | N | A | AMB |
| 12 | Monks (S4 Capital) | AIN | "Your always-on agents for last-mile intelligence — rapid, real, and powered by monks.flow" | https://www.monks.com | home | ASSISTS | 1 says it | no | speed, constant vigilance | Y | A | AMB |
| 13 | Mutinex | AIN | "Autonomous agentic build, human oversight" | https://www.mutinex.co/agentic-mmm | product | ASSISTS | 1 says it | no | speed with safety | Y | A | AMB |
| 14 | Mutinex | AIN | "< 24H: From raw data to production ready" | https://www.mutinex.co/agentic-mmm | product | ASSISTS | 2 prints a figure | no | speed | N | A | AMB |
| 15 | PubMatic | AIN | "The first operating system that lets AI agents plan, execute, and optimize media — guided by your strategy." | https://pubmatic.com | home | ACTS | 1 says it | no | mastery, control | Y | B | GRD |
| 16 | PubMatic | AIN | "Powered by PubMatic's AgenticOS, the campaign automated setup and optimisation from a simple natural‑language brief." | https://pubmatic.com | home | ACTS | 3 names the advertiser | no | ease, speed | Y | B |  |
| 17 | PubMatic | AIN | "By leveraging autonomous AI agents for planning and buying, the partnership transformed how campaigns are built and optimized." | https://pubmatic.com | home | ACTS | 3 names the advertiser | no | transformation, competitive advantage | Y | A |  |
| 18 | PubMatic | AIN | "Today, agentic workflows in programmatic advertising operate within defined permissions and explicit user direction." | https://pubmatic.com/blog/trust-is-the-real-innovation-in-agentic-advertising/ | press | ASSISTS | 1 says it | no | safety, trust | Y | A |  |
| 19 | PubMatic | AIN | "There should be a meaningful separation between the execution of a workflow and the approval of that workflow." | https://pubmatic.com/blog/trust-is-the-real-innovation-in-agentic-advertising/ | press | ASSISTS | 1 says it | no | safety, trust | Y | A |  |
| 20 | PubMatic | AIN | "Early adopters of our agentic workflows are seeing measurable efficiency gains: 87% faster setup times, 70% quicker issue resolution, and sub-millisecond response times that outpace manual optimization." | https://pubmatic.com/blog/trust-is-the-real-innovation-in-agentic-advertising/ | press | ASSISTS | 2 prints a figure | no | speed, efficiency | Y | A | AMB |
| 21 | Quantcast | AIN | "Autonomous campaign performance is here. Meet Q+" | https://www.quantcast.com | home | ACTS | 1 says it | no | inevitability, arrival | Y | A |  |
| 22 | Quantcast | AIN | "The Quantcast AI-powered platform autonomously optimizes for your business outcomes, turning real-time insights into competitive advantage." | https://www.quantcast.com | home | ACTS | 1 says it | no | competitive advantage | Y | A |  |
| 23 | Quantcast | AIN | "let Q+ find and convert your next best customer, faster and more efficiently than manual optimization ever could." | https://www.quantcast.com/q-plus/ | product | ACTS | 1 says it | no | mastery over manual work | N | A |  |
| 24 | Salesforce Marketing Cloud | AIN | "Multiply every marketer with agents that act." | https://www.salesforce.com/marketing/ | home | ACTS | 1 says it | no | amplification, mastery | Y | A |  |
| 25 | Salesforce Marketing Cloud | AIN | "You set the goal and guardrails, and let campaign agent handle generating content for every channel, build every campaign from your brand guidelines, and optimize as it sends according to customer intent signals." | https://www.salesforce.com/marketing/ | home | ACTS | 1 says it | no | delegation with control | Y | A | GRD |
| 26 | Salesforce Marketing Cloud | AIN | "Now every campaign improves itself with an agent continuously working towards your goals." | https://www.salesforce.com/marketing/ | home | ACTS | 1 says it | no | effortless improvement | Y | A |  |
| 27 | Apostra (was Scope3) | AIN | "AI agents can discover, plan, buy and optimize advertising at a scale humans never could." | https://apostra.com/ | home | ACTS | 1 says it | no | scale, superhuman capability | Y | A |  |
| 28 | Apostra (was Scope3) | AIN | "Configure an agent through Apostra or bring one you already trust. Agents discover, evaluate, respond and transact within the objectives, context and rules you set." | https://apostra.com/ | home | ACTS | 1 says it | no | delegation with control | Y | B | GRD |
| 29 | Apostra (was Scope3) | AIN | "Humans set the objectives, context and rules. Agents handle the work required to act on them." | https://apostra.com/ | home | ACTS | 1 says it | no | delegation with control | Y | A | GRD |
| 30 | Apostra (was Scope3) | AIN | "Negotiates" | https://apostra.com/ | home | ACTS | 1 says it | no | scale, effortlessness | Y | B (list item; separators are fetcher rendering) | GRD |
| 31 | Skai | AIN | "Skai is the agent-native, omnichannel marketing platform." | https://skai.io | home | ASSISTS | 1 says it | no | modernity, readiness | Y | A | AMB |
| 32 | Skai | AIN | "Design, run and govern your own agents and media workflows in one place, without engineering the entire foundation yourself." | https://skai.io | home | ASSISTS | 1 says it | no | control, mastery | Y | A |  |
| 33 | Smartly | AIN | "Turn performance insights into Intelligent Creative automatically, so every campaign improves as it runs." | https://www.smartly.io | home | ACTS | 1 says it | no | effortless improvement | N | A |  |
| 34 | Smartly | AIN | "AI does the heavy lifting. You make smarter decisions every time." | https://www.smartly.io | home | ASSISTS | 1 says it | no | relief from drudgery, mastery | N | A |  |
| 35 | Typeface | AIN | "Hand over the outcome to bespoke agents" | https://www.typeface.ai | home | ACTS | 1 says it | no | relief, delegation | Y | A |  |
| 36 | Typeface | AIN | "Describe what you need and agents plan, execute, check their own work, and iterate until it clears your bar." | https://www.typeface.ai | home | ACTS | 1 says it | no | delegation with control | Y | A | GRD |
| 37 | Writer | AIN | "Not a tool you prompt. An agent you delegate to." | https://writer.com | home | ACTS | 1 says it | no | delegation, relief | Y | A |  |
| 38 | Writer | AIN | "Describe what you need and WRITER executes from start to finish, delivering polished, on-brand work in minutes." | https://writer.com | home | ACTS | 1 says it | no | speed, relief | N | A |  |
| 39 | Writer | AIN | "Review only for edge cases, cutting cycles by weeks." | https://writer.com | home | ASSISTS | 1 says it | no | speed with safety | N | A | AMB |
| 40 | Haus | OUT | "Architect uses causal data and frontier AI to spot risks and opportunities, conduct "what-if" analyses, and provide causal recommendations on next best action." | https://www.haus.io | home | ASSISTS | 1 says it | no | certainty, confidence | N | A |  |
| 41 | Kochava | OUT | "agentic AI capabilities put autonomous intelligence to work" | https://www.kochava.com | home | ACTS | 1 says it | no | capability, arrival | Y | A |  |
| 42 | Kochava | OUT | "build AI agents that automate complex marketing tasks" | https://www.kochava.com | home | ASSISTS | 1 says it | no | relief from drudgery | Y | A | AMB |
| 43 | MNTN | OUT | "AI builds the plan. You make the final call." | https://mountain.com | home | ASSISTS | 1 says it | no | control and safety | N | A |  |
| 44 | MNTN | OUT | "Review and edit every recommendation before launch." | https://mountain.com | home | ASSISTS | 1 says it | no | control and safety | N | A |  |
| 45 | MNTN | OUT | "Once your campaign launches, MNTN's AI analyzes over 1 trillion behavioral signals per day and makes over 4 million bid decisions per second" | https://mountain.com | home | ACTS | 2 prints a figure | no | scale, power | N | A |  |
| 46 | Nexxen | OUT | "nexAI embeds AI agents across planning, activation, optimization and monetization" | https://aimagazine.com/globenewswire/3312626 | press | ASSISTS | 1 says it | no | comprehensiveness, modernity | Y | A | AMB |
| 47 | Nexxen | OUT | "teams can stand up a reporting agent that compiles cross-campaign performance overnight" | https://aimagazine.com/globenewswire/3312626 | press | ASSISTS | 1 says it | no | relief, speed | Y | A |  |
| 48 | Taboola | OUT | "Realize+ is an agentic system that helps performance marketers unlock more conversions" | https://investors.taboola.com/news-releases/news-release-details/taboola-launches-realize-agentic-ai-system-turning-advertiser/ | press | ASSISTS | 1 says it | no | growth | Y | A | AMB |
| 49 | Taboola | OUT | "continuously makes and executes campaign decisions, helping drive incremental results" | https://investors.taboola.com/news-releases/news-release-details/taboola-launches-realize-agentic-ai-system-turning-advertiser/ | press | ACTS | 1 says it | no | always-on vigilance | Y | A |  |
| 50 | Taboola | OUT | "automatically moves budget in real time to the highest-performing campaigns" | https://investors.taboola.com/news-releases/news-release-details/taboola-launches-realize-agentic-ai-system-turning-advertiser/ | press | ACTS | 1 says it | no | speed, efficiency | N | A |  |
| 51 | Taboola | OUT | "intelligent agents that operate continuously on behalf of advertisers" | https://investors.taboola.com/news-releases/news-release-details/taboola-launches-realize-agentic-ai-system-turning-advertiser/ | press | ACTS | 1 says it | no | always-on vigilance, delegation | Y | A |  |
| 52 | Tatari | OUT | "The team is increasingly moving toward letting the Planning Engine run without modification, especially below that weekly threshold, trusting the AI to do a good job without a human in the loop for every decision." | https://www.tatari.tv/insights/how-tataris-ai-planning-engine-is-rewriting-whats-possible-in-tv-advertising | press | ACTS | 4 shows the method | no | trust earned by proof | Y | B |  |
| 53 | Tatari | OUT | "In 17 of 18 valid cases, the unmodified AI plan performed as well or better than the human-adjusted version." | https://www.tatari.tv/insights/how-tataris-ai-planning-engine-is-rewriting-whats-possible-in-tv-advertising | press | ACTS | 4 shows the method | no | vindication of the machine | N | B |  |
| 54 | Tatari | OUT | "Tatari's Planning Engine cut our weekly planning cycle from an hour to almost instant, and since we started using it, we've seen a 50% improvement in our CPA," | https://www.tatari.tv/insights/how-tataris-ai-planning-engine-is-rewriting-whats-possible-in-tv-advertising | press | ASSISTS | 3 names the advertiser | no | speed, relief | N | B | AMB |
| 55 | Tatari | OUT | "Tatari's AI makes that decisioning call in real time, based on years of observed performance data" | https://www.tatari.tv/insights/watch-from-black-box-to-built-in-skill-how-ai-is-rewriting-the-rules-of-tv-advertising | press | ACTS | 1 says it | no | expertise, speed | N | A |  |
| 56 | Adform | SPR | "Adform opens full-stack infrastructure for Agentic Advertising" | https://site.adform.com | home | ASSISTS | 1 says it | no | readiness, openness | Y | A | AMB |
| 57 | Adform | SPR | "Adform's new capabilities enable advertisers and agencies to interact directly with Adform FLOW through external AI tools like Claude and ChatGPT." | https://secure.businesswire.com/news/home/20260615457216/en/Adform-Opens-Full-Stack-Infrastructure-for-Agentic-Advertising | press | ASSISTS | 1 says it | no | convenience, connectedness | Y | A |  |
| 58 | Adform | SPR | "With more than 800 agentic capabilities across one integrated platform" | https://secure.businesswire.com/news/home/20260615457216/en/Adform-Opens-Full-Stack-Infrastructure-for-Agentic-Advertising | press | ASSISTS | 2 prints a figure | no | scale, comprehensiveness | Y | A | AMB |
| 59 | The Trade Desk | SPR | "Koa powers a growing set of agentic capabilities within Kokai, including a new conversational experience and specialized Koa Agents that help users automate tasks" | https://investors.thetradedesk.com/news-and-events/news/news-details/2026/The-Trade-Desk-Introduces-Kokai-Zuma-the-Latest-Release-of-Kokai/default.aspx | press | ASSISTS | 1 says it | no | efficiency, simplification | Y | A |  |
| 60 | The Trade Desk | SPR | "Users will be able to prioritize campaign outcomes and move faster by automating campaign changes" | https://investors.thetradedesk.com/news-and-events/news/news-details/2026/The-Trade-Desk-Introduces-Kokai-Zuma-the-Latest-Release-of-Kokai/default.aspx | press | ASSISTS | 1 says it | no | speed | N | A | AMB |
| 61 | Amazon Ads | SPR | "Ads Agent, an AI agent that simplifies how advertisers plan, launch, and optimize campaigns." | https://advertising.amazon.com/resources/whats-new/unboxed-2025-introducing-ads-agent | press | ASSISTS | 1 says it | no | simplification | Y | A |  |
| 62 | Amazon Ads | SPR | "Campaigns only launch after you review and approve." | https://advertising.amazon.com/resources/whats-new/unboxed-2025-introducing-ads-agent | press | ASSISTS | 1 says it | no | control and safety | N | A |  |
| 63 | Google Ads | SPR | "Google AI automatically finds your most profitable customers wherever they're searching, streaming, shopping" | https://business.google.com/en-all/google-ads/ | home | ACTS | 1 says it | no | growth, profit | N | A |  |
| 64 | Criteo | SPR | "See how Agentic Audiences make audience building smarter, faster, and more streamlined with AI." | https://www.criteo.com | home | ASSISTS | 1 says it | no | speed, smarter | Y | A | AMB |
| 65 | WPP | SPR | "powered by exceptional talent and our agentic marketing platform, WPP Open" | https://www.wpp.com | home | ASSISTS | 1 says it | no | humans plus machines, pride | Y | A | AMB |
| 66 | Publicis Groupe | SPR | "embed agentic AI across the entire flow of work so marketers can focus on what they do best" | https://www.publicisgroupe.com/sites/default/files/press-releases/2026-04/Publicis%20Groupe_Microsoft_press%20release.pdf | press | ASSISTS | 1 says it | no | relief from drudgery | Y | A |  |
| 67 | Publicis Groupe | SPR | "AI agent can autonomously identify high-value customer segments, generate and personalize content, deploy campaigns across channels, and continuously optimize spend in real time — within guardrails set by marketing leaders" | https://www.publicisgroupe.com/sites/default/files/press-releases/2026-04/Publicis%20Groupe_Microsoft_press%20release.pdf | press | ACTS | 1 says it | no | delegation with control | Y | A | GRD |
| 68 | Adobe Experience Cloud | SPR | "Boost brand impact with AI-powered agents" | https://business.adobe.com | home | ASSISTS | 1 says it | no | impact, growth | Y | A | AMB |
| 69 | Magnite | SPR | "a coordination layer that enables buyers to connect their buyer agents to Magnite's seller agent" | https://www.magnite.com/blog/introducing-magnite-orchestration/ | press | ASSISTS | 1 says it | no | readiness, plumbing | Y | A | AMB |
| 70 | Magnite | SPR | "Connected buyer agents can then evaluate those products against campaign goals and help buyers move toward activation" | https://www.magnite.com/blog/introducing-magnite-orchestration/ | press | ASSISTS | 1 says it | no | efficiency | Y | A |  |
| 71 | Integral Ad Science | SPR | "Get AI-powered campaign recommendations mid-flight that lighten your workload" | https://integralads.com/ias-agent/ | product | ASSISTS | 1 says it | no | relief from drudgery | N | A |  |
| 72 | Integral Ad Science | SPR | "Customize, override, or adopt recommendations with complete transparency" | https://integralads.com/ias-agent/ | product | ASSISTS | 1 says it | no | control and safety | N | A |  |
| 73 | Integral Ad Science | SPR | "Reduce setup time by up to 50% with AI-Generated Brand Safety and Suitability recommendations" | https://integralads.com/ias-agent/ | product | ASSISTS | 2 prints a figure | no | efficiency | N | A |  |
| 74 | LiveRamp | SPR | "Help AI agents act smarter" | https://liveramp.com | home | ASSISTS | 1 says it | no | readiness, intelligence | Y | A | AMB |
| 75 | Databricks | SPR | "CustomerLake's purpose-built Campaign Agents help marketers build continuous, agent-driven engagement loops" | https://www.databricks.com/solutions/industries/marketing | product | ASSISTS | 1 says it | no | always-on engagement | Y | A |  |
| 76 | Databricks | SPR | "agents that help automate campaign planning, decisioning, and optimization." | https://www.databricks.com/solutions/industries/marketing | product | ASSISTS | 1 says it | no | efficiency | Y | A |  |
| 77 | Equativ | SPR | "Cut campaign planning time by up to 40% and eliminate repetitive tasks with our suite of AI-powered programmatic agents." | https://equativ.com | home | ASSISTS | 2 prints a figure | no | relief from drudgery | Y | A | AMB |
| 78 | Equativ | SPR | "Maestro by Equativ Agents effortlessly optimize outcomes." | https://equativ.com | home | ACTS | 1 says it | no | effortlessness | Y | A |  |
| 79 | Pacvue | SPR | "Pacvue Agent turns recommendations into approval-based execution with clear guardrails" | https://pacvue.com | home | ASSISTS | 1 says it | no | control and safety | Y | A |  |
| 80 | Pacvue | SPR | "One agent auditing accounts, generating a tailored execution plan, and applying changes across budgets, bids, and creatives instantly." | https://pacvue.com | home | ASSISTS | 1 says it | no | speed | Y | A | AMB |

Notes on specific rows:

- Row for Apostra "Negotiates": the string is one item in an agent-activity list under the heading "Human control, agent scale". The list as returned by the fetcher: "Finds opportunities / Checks audience fit / Scores potential / Compares pricing / Applies brand rules / Builds a plan / Requests terms / Reads proposals / Negotiates / Allocates budget / Books CTV / Books audio / Books OOH / Books social / Checks safety / Paces spend / Reallocates / Tracks delivery / Flags exceptions / Reports back". The item labels are verbatim by the second fetch; the "/" separators are probably the fetcher's rendering of a list or chip layout. Not certain of exact punctuation.
- Apostra homepage also says (second fetch, verbatim): "Buyers can browse or send a brief. You set the price and rules. Your agent handles the response." This is the seller-side agent.
- PubMatic row 3 uses a non-breaking hyphen in "natural‑language" as returned.
- Klaviyo "resolves 65% of questions autonomously": the homepage gives no source. A separate ROI-calculator page says "The 65% default resolution rate reflects Klaviyo's cross-company aggregate resolution rate across paying customers." and "ROI figures are based on a subset of Klaviyo Customer Agent customers that self-reported resolution rates. These customers participated in case studies and may not necessarily be representative." We coded the homepage claim rung 2 (source not beside it). A method note exists one click away, from the vendor, self-reported.
- Tatari rungs: the "17 of 18" and "without a human in the loop" sentences sit in an article that describes "a four-week randomized A/B test" run by Tatari on its own clients. No external auditor. Rung 4, method shown, not rung 5. Fetcher gave the figures "17 of 18 valid cases" and "12 of the 18" (the second is for clients under about $19.5K a week).
- Salesforce homepage prints figures ("32% increase in overall marketing ROI" etc.) attributed to "Salesforce Customer Success Metrics". They are not attached to the agent claims, so not coded against them.
- Mutinex: "Autonomous agentic build, human oversight" is coded ASSISTS because the same phrase includes human oversight.

## Companies checked and result

| company | group | result | notes |
|---|---|---|---|
| 6sense | AIN | agentic claim coded |  |
| Apostra (was Scope3) | AIN | agentic claim coded | scope3.com redirects to apostra.com; frame lists Scope3 |
| Iterable | AIN | agentic claim coded |  |
| Jasper | AIN | agentic claim coded |  |
| Klaviyo | AIN | agentic claim coded |  |
| Liftoff | AIN | none found | liftoff.io redirects to liftoff.ai; home page says AI/ML powers the platform, no agent claim found |
| Microsoft Advertising | AIN | agentic claim coded | home page: "Agentic commerce" link only; claim comes from the agentic-commerce product page |
| Moloco | AIN | label only | "agentic commerce" appears as a nav item only |
| Monks (S4 Capital) | AIN | agentic claim coded |  |
| Mutinex | AIN | agentic claim coded | home page headline "Agentic Commercial Mix Model"; claims from /agentic-mmm |
| PubMatic | AIN | agentic claim coded |  |
| Quantcast | AIN | agentic claim coded |  |
| Salesforce Marketing Cloud | AIN | agentic claim coded |  |
| Skai | AIN | agentic claim coded |  |
| Smartly | AIN | agentic claim coded |  |
| StackAdapt | AIN | none found | home page frames AI as working alongside the user; no agent claim found |
| The Brandtech Group (Pencil) | AIN | none found | generative AI content language; no agent claim found |
| Typeface | AIN | agentic claim coded |  |
| Writer | AIN | agentic claim coded |  |
| Zefr | AIN | none found | own home page: none found. AdExchanger (2026-04-30) reports a Zefr agent using AdCP; see third-party table |
| AppLovin (Axon) | OUT | none found | home page is thin; axon.ai redirects to applovin.com/en |
| Attain | OUT | none found | data and measurement language only |
| Cint (Lucid) | OUT | none found | no agent claim; "AI-Moderated Interviews" as a product |
| Haus | OUT | agentic claim coded |  |
| Keen Decision Systems | OUT | none found | decision-support language |
| Kochava | OUT | agentic claim coded |  |
| MNTN | OUT | agentic claim coded |  |
| MiQ | OUT | none found | own home page: none found. ppc.land (2026-06-11) reports a Sigma planning agent; see third-party table |
| NCSolutions (Circana) | OUT | label only | blog title "Agentic Commerce and the New Measurement Question: Circana at Cannes 2026" only |
| Nexxen | OUT | agentic claim coded | home page none; claims from press release 2026-06-16 |
| Recast | OUT | none found | only mention is an MCP integration to ask Claude questions |
| Rokt | OUT | none found | "AI Brain" relevance language; no agent claim found |
| Samba TV | OUT | label only | blog headline about acquiring Bestever AI "to Accelerate the Future of Agentic Advertising" only |
| Taboola | OUT | agentic claim coded | home page none; claims from Realize+ press release 2026-04-23 |
| Tatari | OUT | agentic claim coded | home page none; claims from two insights posts |
| Teads | OUT | none found | predictive AI language; no agent claim found |
| Tinuiti | OUT | none found | "AI SEO" and "AdCopy AI" as services |
| Vibe | OUT | none found | "AI-powered solutions" only |
| Adform | SPR | agentic claim coded |  |
| Adobe Experience Cloud | SPR | agentic claim coded |  |
| Amazon Ads | SPR | agentic claim coded | home page none found; claims from Ads Agent launch page 2025-11-11 |
| Basis Technologies | SPR | label only | "Is Your Agency Ready for Agentic Advertising?" headline; label only |
| Criteo | SPR | agentic claim coded |  |
| Databricks | SPR | agentic claim coded |  |
| Dentsu | SPR | none found | corporate page, none found |
| DoubleVerify | SPR | none found | "AI" and algorithm language, not agent claims |
| Equativ | SPR | agentic claim coded |  |
| Google Ads | SPR | agentic claim coded |  |
| Index Exchange | SPR | label only | video titles about ARTF and agentic advertising; label only |
| Integral Ad Science | SPR | agentic claim coded | home page none; claims from IAS Agent page |
| LiveRamp | SPR | agentic claim coded |  |
| Magnite | SPR | agentic claim coded | home page headline + blog |
| Mediaocean | SPR | label only | "A Blueprint for Agentic Advertising" link; label only |
| Meta for Business | SPR | none found | own page none found; Meta AI tooling reported by Marketing-Interactive (2026-08-20); see third-party table |
| Omnicom (incl. IPG) | SPR | none found | "Agent Orchestration" appears as a label on omc.com; no claim sentence |
| Pacvue | SPR | agentic claim coded |  |
| Publicis Groupe | SPR | agentic claim coded | home page none; claims from Microsoft partnership release 2026-04-08 |
| Samsung Ads | SPR | none found | none found |
| The Trade Desk | SPR | agentic claim coded | home page none found; claims from Kokai Zuma release 2026-08-27 |
| Viant | SPR | none found | "AI-powered tools", no agent claim on the home page read (MADDB lists a Lattice Brain podcast) |
| VideoAmp | SPR | none found | "AI-powered reporting" only |
| WPP | SPR | agentic claim coded |  |
| Walmart Connect | SPR | none found | "AI-powered features" only |
| Yahoo DSP | SPR | none found | yahooinc.com corporate page, none found |

Liftoff and Moloco appear in both the AI-native and outcome-seller lists and are counted once (64 unique).

## Counter-evidence read from contracts and third parties (not counted in the 80)

**Contract**

| company | verbatim | url | note |
|---|---|---|---|
| PubMatic | "PubMatic does not guarantee the outcome of any given campaign and does not guarantee any specific results." | https://pubmatic.com/legal/agenticOS-agreement/ | Section 3.2, AgenticOS agreement, last updated 2026-02-05. Verified on two fetches. |
| PubMatic | "Company assumes any and all risk, and accepts all responsibility and liability, arising from Company's adoption or approval of any proposals, recommendations, decisions or automated actions generated by Agentic Buying systems" | https://pubmatic.com/legal/agenticOS-agreement/ | Section 3.3. Second fetch drops one "any and all" from the first fetch's wording; the second version is quoted. |
| PubMatic | "COMPANY ACKNOWLEDGES AND AGREES THAT PUBMATIC PROVIDES NO GUARANTEE OF VOLUME OF IMPRESSIONS DELIVERED, CLICKS RECEIVED OR AMOUNT OF REVENUE EARNED HEREUNDER." | https://pubmatic.com/legal/agenticOS-agreement/ | Section 10.3. Fetch found no fee tied to outcomes and no clause letting agents negotiate terms. |

**Third-party and off-frame press** (not company-owned claims for companies in the frame, or companies outside the frame)

| source / company | verbatim | url | date | autonomy | rung | note |
|---|---|---|---|---|---|---|
| R2B2 (off frame; buyer named: Omnicom Media, in frame) via PPC Land | "Inventory was matched, terms were negotiated, and the purchase was executed end-to-end by autonomous AI agents." | https://ppc.land/czech-republic-gets-its-first-fully-autonomous-ai-ad-buy/ | 2026-06-24 | ACTS | 1 | Two fetches agree. Same article: "According to R2B2, publishers retain the final say: every campaign and creative asset must be manually approved by MAFRA before it goes live." No budget or result disclosed; described as "modest - one campaign, one buyer, one publisher". Omnicom's own site says nothing of this. |
| Universal Ads (Comcast Advertising, off frame) | "Buyer and seller agents can iterate in real time to finalize pricing and packaging." | https://www.universalads.com/blog/ai-agent-ad-buying | 2026-09-02 | ACTS | 3 (pilot advertiser Crexi named) | Two fetches agree. Same page: "Guardrails, along with human oversight, ensure quality execution and alignment with brand standards." No guarantee or results-tied pricing found. |
| Zefr via AdExchanger | "If an advertiser neglects to share any important information, like budget or flight dates, the agent will follow up with the human before making the buy." | https://www.adexchanger.com/ai/zefr-builds-a-new-front-door-for-youtube-buys | 2026-04-30 | ASSISTS | 1 | Journalist's sentence, not Zefr's. |
| MiQ via PPC Land | "MiQ Sigma's Trading Agent operating inside it and running live campaigns" ; "traders have been making twice as many optimizations as before, and that speed has directly improved campaign performance" ; "Sigma campaigns returning $2.22 in value for every $1 spent" | https://ppc.land/miq-upgrades-sigma-a-year-in-planning-agent-and-2-5pb-of-daily-data/ | 2026-06-11 | ACTS / ASSISTS / n.a. | 1 / 2 / 2 | One fetch only. The $2.22 figure is platform-wide (fetcher: 40,000 campaigns, 2,300 advertisers), not agent-specific. |
| Meta via Marketing-Interactive | "Businesses can ask Meta AI to review which audiences are delivering results" | https://www.marketing-interactive.com/meta-ai-gets-new-tools-to-analyse-and-optimise-ad-campaigns | 2026-08-20 | ASSISTS | 1 | One fetch only. |
| DataBeat via PPC Land / Relevant Audience | "AI agents buying ad inventory entered 86% fewer auctions than conventional demand-side platforms, and cleared their impressions at $6.13 CPM against $6.95 for conventional buyers, a difference of 13.4%." | https://www.relevantaudience.com/ai/ai-ad-buying-agents-86-percent-fewer-auctions-databeat/ | 2026-06/08 (dates differ across the two write-ups) | n.a. | closest thing to rung 5 | DataBeat is a programmatic analytics provider; PPC Land says it "draws data from leading SSPs such as PubMatic" and does not appear to sell agents. Dataset: "more than $55 million in monthly revenue, 35 billion monthly impressions, and signals from over 200 bidders". PPC Land notes the report does not explain whether the gap stems from inventory quality or win-rate optimisation. Not tied to any single company's claim; partly dependent on a sell-side partner. |
| Adweek (Rouge Care / PubMatic) | "Red-light therapy brand Rouge Care is crediting AI agents with a fivefold return on ad spend." | https://www.adweek.com/?p=1958636 | 2026-09-03 | ACTS | 3 | Page was partly paywalled. Fetcher: "The campaign delivered 500%, resulting in over $125,000 in attributable sales" against $25,000 spend; measurement attributed to Rouge Care's own senior copywriter; no independent verification. PubMatic's homepage prints this as "5x return on ad spend" beside Klever and Rouge Care. |
| Omnicom CFO via ExchangeWire | "Between 80% and 90% of Flywheel's work is priced according to results rather than hours, he said." and "The shift, he said, will unfold gradually rather than all at once, and won't apply uniformly." | https://www.exchangewire.com/blog/2026/09/15/digest-omnicom-eyes-new-pricing-model-anthropic-forecasts-second-straight-quarter-of-profit | 2026-09-15 | n.a. | n.a. | Two fetches agree. Phil Angelastro, CFO, at an investor conference. This is agency work priced on results, not an agent claim. Omnicom Media APAC's Tony Harradine (Storyboard18, 2026-03-18): "The onset of technology may change the commercial model. Historically agencies have been based on people-based fees. But we may move more towards business outcome-based metrics." |
| Digiday (Seb Joseph) | "No one has released fully autonomous agents yet, though it's clearly the roadmap" (Permutive CEO Joe Root, as reported) and "this phase isn't about agents taking over" | https://digiday.com/marketing/future-of-marketing-briefing-the-agent-era-on-training-wheels/ | 2025-11-07 | n.a. | n.a. | Outsider view a year older than our pages. One fetch. |
| PPC Land on Magnite / PubMatic | Magnite CEO forecast of "$600 million to $700 million" of protocol-based ad spend in 2027, "modest against total programmatic volume" | https://ppc.land/agencies-turn-ai-tokens-into-a-margin-business-as-agentic-spend-stalls/ | 2026-07-16 | n.a. | n.a. | One fetch. Same article: Omnicom CEO John Wren (2026-07-29): "the marketplace hasn't seen what the cost of this AI is". |
| Klaviyo Customer Agent pricing via usagepricing.com | "Customer Agent meters AI conversations at $200/month list for 200, discounted to $140 through September 30, 2026." | https://usagepricing.com/blueprint/klaviyo | n.d. | n.a. | n.a. | Third-party pricing site, one fetch. The agent "resolves 65% of questions autonomously" but is metered per AI conversation, not per resolution. Klaviyo's own pricing page did not show it. |
| Microsoft Advertising | "Today, Microsoft does not take a commission or affiliate fee." | https://about.ads.microsoft.com/en/solutions/technology/agentic-commerce | n.d. | n.a. | n.a. | A pricing statement on the agentic-commerce page. Not tied to a result. One fetch. |

## Answers to the six questions

### 1. How many companies make an agentic claim at all?

Denominator: 64 companies, read on their home page (or the frame URL) plus, where the home page was thin, one or more press, blog or product pages found by search.

| group | checked | agentic claim coded | label only | none found |
|---|---|---|---|---|
| AI-native | 20 | 15 | 1 (Moloco) | 4 (Liftoff, StackAdapt, Brandtech, Zefr) |
| Outcome sellers | 20 | 6 (Haus, Kochava, MNTN, Nexxen, Taboola, Tatari) | 3 (Moloco, NCSolutions, Samba TV) | 11 |
| Other segments | 26 | 14 | 3 | 9 |
| All (unique) | 64 | 35 (55%) | 6 | 23 |

Notes. Moloco and Liftoff are in both lists (the AI-native and outcome-seller rows overlap by two; the "All" row de-duplicates). Only 25 of the 35 have the claim on the home page or frame URL. Nexxen, Taboola and Tatari have nothing agentic on their home pages; the claims came from a press release or blog. Under the stricter test (a coded sentence uses agent / agentic / autonomous / "human in the loop" language) the count is 29 of 64 (45%). Five of the 20 companies positioned as "AI-native" gave us no codable agentic sentence on their own pages (Liftoff, StackAdapt, Brandtech, Zefr) or a label only (Moloco). Zefr and MiQ have agent products reported in the trade press (see third-party table) that their own home pages did not mention; our absence count for them describes the page, not the product.

### 2. ASSISTS / ACTS split

80 coded claims: ASSISTS 46, ACTS 34 (57.5% / 42.5%).

| cut | ASSISTS | ACTS |
|---|---|---|
| all 80 claims | 46 | 34 |
| vocabulary Y only (agent / agentic / autonomous) | 31 | 25 |
| GRD claims recoded ASSISTS | 53 | 27 |
| AI-native (39 claims) | 16 | 23 |
| Outcome sellers (16 claims) | 8 | 8 |
| Other segments (25 claims) | 22 | 3 |

Companies with at least one ACTS claim: 17 of the 35 that made a claim (6sense, Apostra, Equativ, Google Ads, Jasper, Klaviyo, Kochava, MNTN, PubMatic, Publicis, Quantcast, Salesforce, Smartly, Taboola, Tatari, Typeface, Writer). 25 of the 46 ASSISTS codes are ambiguity calls; a reader who codes those upward would see roughly 59 ACTS. The rule was to not guess upward, so this read is a floor for ACTS in the wording.

Pattern. The AI-native group writes in the ACTS voice ("agents that act", "An agent you delegate to", "Autonomous campaign performance is here"). Big platforms and incumbents write ASSISTS with an approval step in the sentence ("Campaigns only launch after you review and approve", "approval-based execution with clear guardrails", "Customize, override, or adopt recommendations"). The same company can do both: PubMatic's home page is ACTS ("lets AI agents plan, execute, and optimize"), its blog is ASSISTS ("a meaningful separation between the execution of a workflow and the approval of that workflow").

### 3. Evidence-rung distribution against the outcomes pattern

| rung | outcomes study (n=740) | agentic capture (n=80) |
|---|---|---|
| 1 says it | 221 (30%) | 65 (81%) |
| 2 prints a figure | 159 (21%) | 7 (9%) |
| 3 names the advertiser | 290 (39%) | 6 (8%) |
| 4 shows the method | 42 (6%) | 2 (2%) |
| 5 cites an outsider | 28 (4%) | 0 (0%) |

Read. 81% of agentic claims have nothing beside them, against 30% for outcomes. The modal outcomes rung (names the advertiser, 39%) is 8% here. The 6 rung-3 claims are vendor-owned: 6sense (a Reltio exec), Jasper (Anthropologie; Adidas), PubMatic (Amnet/Interbev; Klever/Rouge Care) and Tatari (Winona). Two claims reach rung 4, both Tatari, describing its own four-week randomized A/B test: "In 17 of 18 valid cases, the unmodified AI plan performed as well or better than the human-adjusted version." No company-owned claim reached rung 5. The nearest outsider data is DataBeat's 86%/13.4% bid analysis, which measures agentic buyers as a class (not a vendor's claim) and draws on partner SSPs including PubMatic.

Caution on the comparison. The two sets are not the same kind of sentence. Outcome claims say "this happened"; agentic claims mostly say "this is what the agent does", which is a capability description and may not need evidence in the way a result does. Also 80 claims from 35 companies is a small n. The comparison is directional. The fact that stands regardless: when agentic claims do carry a number, it is usually a speed or efficiency figure (40%, 50%, 87% faster setup, "1,098 hours") from the vendor, with the exception of Tatari.

### 4. Does any company promise an agent that negotiates terms or price, or commits to a number with a remedy?

**Negotiation: one company in the frame lists it; two more sit outside the frame.**

- **Apostra (formerly Scope3), https://apostra.com/.** The agent-activity list under "Human control, agent scale" contains "Requests terms", "Reads proposals" and "Negotiates". The same page says: "Humans set the objectives, context and rules. Agents handle the work required to act on them." and, on the seller side, "You set the price and rules. Your agent handles the response." So the negotiation claim is one word in a list, bounded by rules the human sets. No fee, price example or outcome is given on that page. The rebrand was reported 2026-09-23 to 2026-09-28 (MADDB: Business Insider, Adweek, MediaPost).
- **Universal Ads (Comcast Advertising; not in the frame),** 2026-09-02: "Buyer and seller agents can iterate in real time to finalize pricing and packaging." Beside it: "Guardrails, along with human oversight, ensure quality execution and alignment with brand standards." A pilot with one named advertiser (Crexi) and FOX Advertising as publishing partner.
- **R2B2 pilot (not in the frame), with Omnicom Media as buyer,** 2026-06-24: "Inventory was matched, terms were negotiated, and the purchase was executed end-to-end by autonomous AI agents." The publisher manually approved every campaign and creative. No budget or results disclosed.
- Trade-press framing, not a company claim: AdExchanger (MADDB snippet, 2026-01-29) says the industry "is racing toward a not-too-distant future where AI agents negotiate programmatic deals on their own". The Measure (CIMM, 2026-09-24; one fetch): "The market is now feeding signals into agent robots and letting them take the wheel on buying, planning and negotiating deals."
- Not found: on Magnite, PubMatic, Adform, The Trade Desk, Index Exchange, Equativ or Mediaocean pages we read, no claim that an agent negotiates price or terms. Magnite's orchestration blog and Adform's release describe discovery, evaluation and activation. PubMatic's agreement says nothing about agents negotiating terms.

**Commitment to a number with a remedy: not found on any page we read.**

- 0 of 80 coded claims mention a guarantee, a remedy, results-tied pricing, or payment on a missed number. Every page-level check for "guarantee, refund, pricing tied to results" returned none.
- The only agent contract read reverses the promise. PubMatic's AgenticOS agreement, Section 3.2: "PubMatic does not guarantee the outcome of any given campaign and does not guarantee any specific results." Section 3.3 puts on the customer "any and all risk" from "automated actions generated by Agentic Buying systems". Liability is capped at 12 months of fees (fetcher summary of the cap clause; wording not double-checked).
- Historic contrast for the study: the 8 guarantees in the outcomes set all sat upstream of the sale (fraud, attention, delivery, completion). We looked for an agentic version at IAS, DoubleVerify and Zefr. IAS Agent's page says only recommendations, and adds: "Please note certain features described on this page reflect the future state of IAS Agent and may evolve". We found none.
- Two adjacent items that are commitments about something else: Microsoft Advertising's agentic-commerce page says "Today, Microsoft does not take a commission or affiliate fee." Mutinex offers "No commitment required" for early access. Neither is tied to a result.

### 5. Is there an intersection: agents transacting on outcomes?

Not on the pages we read. What we found are two adjacent things that have not yet met.

- **Agents whose pitch is a result, priced by something else.** Quantcast: "let Q+ find and convert your next best customer, faster and more efficiently than manual optimization ever could." Taboola Realize+: "continuously makes and executes campaign decisions, helping drive incremental results" and "automatically moves budget in real time to the highest-performing campaigns". MNTN: "makes over 4 million bid decisions per second". Tatari: "trusting the AI to do a good job without a human in the loop for every decision". Klaviyo's Customer Agent "resolves 65% of questions autonomously", but the one price we could find (third-party site) is per AI conversation, not per resolution. None of these pages states a price tied to the result.
- **Outcome-priced work, not agents.** Omnicom's CFO: "Between 80% and 90% of Flywheel's work is priced according to results rather than hours." That is a holding company on agency labour, said at an investor conference and reported by ExchangeWire; it did not appear on omc.com in our read. Omnicom Media APAC's Harradine put it as a "may move" ("But we may move more towards business outcome-based metrics").
- The outcome sellers with the strongest outcome positioning (AppLovin, Attain, Cint, Keen, Rokt, Teads, Tinuiti, Vibe, MiQ, Recast) had no agentic claim on the pages we read. The six that did (Haus, Kochava, MNTN, Nexxen, Taboola, Tatari) framed the agent as speed, planning or automation, not as the party that takes the risk.
- Agentic commerce (agents that buy for shoppers) appears as a label or product page at Microsoft (Copilot Checkout), Moloco (nav item), Circana (blog title) and Criteo. It is a different transaction from advertisers paying on outcomes. Microsoft says it takes no commission.

### 6. Emotional registers

Our coding, primary register per claim, grouped:

| register family | claims (of 80) | ACTS | ASSISTS |
|---|---|---|---|
| relief / delegation / ease | 26 (32%) | 15 | 11 |
| speed / efficiency / always-on | 21 (26%) | 6 | 15 |
| control / safety / trust | 10 (12%) | 0 | 10 |
| readiness / arrival / modernity | 8 (10%) | 3 | 5 |
| scale / power / mastery | 7 (9%) | 6 | 1 |
| growth / advantage | 5 (6%) | 2 | 3 |
| proof / certainty | 3 (4%) | 2 | 1 |

Read. The dominant register is relief and delegation ("Hand over the outcome to bespoke agents", "Not a tool you prompt. An agent you delegate to.", "AI does the heavy lifting"), then speed and efficiency. Together they are 47 of 80 (59%). The second theme is control and safety (12%): "You make the final call", "Review and edit every recommendation before launch", "Campaigns only launch after you review and approve". That register hardly exists in the outcomes language as you describe it, which skews to growth, efficiency and waste. Growth / advantage is 6% here (5 claims). Waste does not appear in any coded agentic claim. Fear of falling behind is present but implicit, in words like "is here", "Ready" and "the first operating system", and in trade-press headlines; it appears in 8 claims as readiness / arrival (10%). It is louder in the surrounding press than in the claims. Mastery and power ("Multiply every marketer", "at a scale humans never could") are 9%.

One more contrast. The ACTS claims are the most relief-shaped (15 of 34 in relief / delegation / ease). The ASSISTS claims are where the safety language lives (all 10 control / safety claims are ASSISTS). Vendors that sell the agent as the actor speak in the language of relief; vendors that sell it as a helper speak in the language of control. Proof / certainty (3 claims) appears only in Haus's causal-recommendation line and Tatari's test write-up.

## Limits: what we could not see

- **Coverage.** 64 of 140 companies. The 76 not read are not shown to be lower or higher on any measure. Selection favoured AI-native and outcome-sellers by design, so the 55% is not a market rate.
- **Depth.** Mostly one home page per company, plus 1 to 3 press, product or blog pages found by search where the home page was thin. Companies with thin home pages (AppLovin, Omnicom, Meta, Amazon, TTD, Viant, Yahoo, Samsung, Walmart) may run agentic products on deeper pages that we did not open. "None found" means none found on the pages we read.
- **Rendering.** WebFetch returns text that a small model extracts. JavaScript-heavy pages, carousels, tabs, videos, gated demos and PDFs may be under-read. Several home pages returned only nav labels. Two fetch targets returned 403 or 404 (The Drum; Samba blog).
- **Verbatim risk.** All quotes are strings the extraction model returned as exact. 7 rows (plus the contract, R2B2, Universal Ads and Omnicom CFO quotes) are confirmed by two differently-worded fetches (marked B); the rest rest on one fetch. Some strings arrived with the fetcher's formatting (list separators, ellipses, a non-breaking hyphen). Spot-check every "A" quote against the live page before any of it is published. Salesforce sentence in row 27 is ungrammatical in the source as returned ("let campaign agent handle generating content...").
- **Time.** Pages read 2026-09-30. Several claims come from press releases dated 2025-11 to 2026-09; a home page may have changed since. Scope3 became Apostra, reported 2026-09-23 to 2026-09-28; the frame still lists Scope3.
- **Coding.** Autonomy and register are one coder's calls. 25 of the 80 claims are ambiguity calls; 7 depend on the guardrail rule. Rung for a claim is judged from the same page or module; a case study on another page could raise it. Claim counts per company vary from 1 to 6, so companies with long pages weigh more.
- **Not seen.** Sales decks, order forms, IOs, RFP responses, private contracts, MSAs for other vendors, pilots with SLAs, and any pricing behind a login. A guarantee could sit in an order form and never on a web page. We read one contract (PubMatic). We did not read the terms pages of the other 63.
- **Third-party items** in the counter-evidence tables come from one or two fetches, some of which were partly paywalled (Adweek), and were not coded into the 80-claim counts. DataBeat's dates differ across the two write-ups (June 22 vs August 16); we did not resolve which report edition the 86% / 13.4% figures come from.
- **MADDB.** Company briefs were not pulled. Five news searches hit a rate limit and were rerun. Long-phrase queries such as "agent-to-agent negotiation advertising", "outcome guarantee agentic pay for performance agent" and "guaranteed outcomes AI agent advertising" returned nothing from MADDB; that is a statement about MADDB's index and query matching, not about the market.

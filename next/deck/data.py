# -*- coding: utf-8 -*-
# The Outcomes Opportunity. Figures recomputed 30 September 2026 from hub/data/*.csv
# and agentic_capture.md. Plain business English. No slide assumes the one before it.

COVER=("Everybody sells outcomes.","Almost nobody guarantees one.",
 "What 140 advertising and media companies promise on their own websites, "
 "and what the gap is worth to whoever closes it first.")

# --- 2 what an outcome is, and who says they sell it ---
WHATIS=[("cart","A sale","A purchase the advertiser can see in its own books."),
 ("user","A signup","A trial started, an account opened, a lead handed over."),
 ("receipt","A store visit","A trip to the shelf, matched back to the ad."),
 ("hash","A lift in revenue","More than the business would have done anyway.")]
WHOSAYS=[("137 of 138","companies make at least one claim like this"),
 ("740 of 2,213","claims we read are about a result, not a feature"),
 ("30 of 140","build their whole front-door pitch on the word")]

# --- 3 the gap ---
GAPBIG=("8","of 2,213 claims put anything at risk if the number is missed")
GUAR=[("Fraud","Google DV360, Madhive","A refund on fraudulent impressions."),
 ("Attention","Adelaide","An attention score, for one named advertiser."),
 ("Delivery","VideoAmp, Samba TV","Delivery against an agreed currency."),
 ("Completion","Channel Factory","A cost per view, against a benchmark.")]
GAPLABEL="What the eight cover. Every one of them happens before the sale."

# --- 4 the precedent ---
SEQ=[("Audience","1952&ndash;1967","Nielsen ratings","Make-good time"),
     ("Impressions","1995","Ad server logs, the ABC","Make-good impressions"),
     ("Viewability","2013&ndash;2015","The MRC","No payment"),
     ("Attention","2026","Adelaide","Announced &middot; no remedy stated"),
     ("A business result","Now","None yet accredited","Open")]
DONE=("It has been done anyway, five times, each one narrow: Meredith 2011 &middot; "
 "the MPA and 16 publishers 2015 &middot; Simulmedia 2015 &middot; Westwood One 2017 "
 "&middot; LG Ads 2022. Each named a remedy. None became a standard.")

# --- 5 agents ---
AGSTAT=("35 of the 64","companies we re-read now make a claim about AI agents planning, "
 "buying or optimising media on their own")
AGQ=[("On the home page","The first operating system that lets AI agents plan, execute, and "
   "optimize media.","pubmatic.com"),
 ("On the company blog","There should be a meaningful separation between the execution of a "
   "workflow and the approval of that workflow.","pubmatic.com/blog"),
 ("In the contract, &sect;3.2","PubMatic does not guarantee the outcome of any given campaign "
   "and does not guarantee any specific results.","pubmatic.com/legal")]
AGPOINT=""

# --- 6 the study ---
STUDY=[("page","627 pages","Home page first, then product, pricing, press. Every company the "
   "same way."),
 ("quote","2,213 claims","Each one copied word for word, with the link to the page it sat on."),
 ("scale","740 about a result","Sorted by one question: what can a buyer check without leaving "
   "the page?"),
 ("stamp","A second read","An outside reviewer checked every conclusion and wrote down what it "
   "could not support.")]
STUDYNOTE=("120 companies across twelve parts of the supply chain, plus 20 whose product is "
 "the result itself.")

# --- 7 six real claims ---
SAYS=[("quote",0,"Sprout Social","Go from setup to inevitable ROI","sproutsocial.com",
   "Nothing sits beside it"),
 ("hash",1,"Circana","Deliver up to 9x ROI","circana.com","A number, no source"),
 ("user",2,"Taboola","Hyundai partnered with Taboola to boost their campaign performance, "
   "resulting in a 30% lower Cost per Session.","taboola.com","The client is named"),
 ("flask",3,"Vizio &middot; Walmart","how much incremental reach they&rsquo;re gaining with "
   "VIZIO vs. their linear campaigns","vizio.com","The test is described"),
 ("stamp",4,"Paramount","6X longer ad views than social (Source: &hellip; x MediaScience, "
   "Q423)","paramount.com","An outside firm is named")]
SAYSCAP=("AppLovin","Amazon delivered the stronger return with a 14.61% revenue lift, "
 "generating $117K in incremental revenue at a $1.24 incremental ROAS.",
 "The client named, the test described, and the test run by the advertiser rather than the "
 "seller &mdash; a geo-holdout by Ridge.")

# --- 8 the ladder ---
LADDER=[("quote","Says it","The claim, and nothing beside it.",221,False),
 ("hash","Shows a number","A figure, with no source named.",159,True),
 ("user","Names the client","The advertiser it happened to.",290,True),
 ("flask","Shows how it was measured","The test design, on the page.",42,False),
 ("stamp","Names the independent measurement",
  "An outside measurement firm, or a test the seller did not run.",28,False)]
LADFINE=("Each claim counts once, on the highest thing a buyer can check on the page. "
 "<b>The 449 that already print a number or name a client are closest to the line: one "
 "sentence about how it was measured moves them across it.</b>")

# --- 9 agentic ladder ---
AGENTIC=[("Says it",81),("Shows a number",9),("Names the client",8),
 ("Shows how it was measured",2),("Names the independent measurement",0)]
AGTQ=("Tatari","In 17 of 18 valid cases, the unmodified AI plan performed as well or better "
 "than the human-adjusted version.",
 "The only agentic claim we found with a test behind it. Tatari&rsquo;s own four-week "
 "randomised A/B test, on its own clients.")
AGFINE=("64 companies re-read on 30 September &middot; 35 carry an agentic claim &middot; "
 "80 claims coded. Not the same kind of sentence as a results claim, so read the comparison "
 "as directional.")

# --- 10 positions ---
POS=[("flask","Test what the agent did","Our agents run the buy, and we measure what they "
   "changed.","A holdout on agent-run spend against human-run spend, published.",
   "Tatari is closest today"),
 ("stamp","Bring in an outside firm","Someone who does not sell this measured the result.",
   "An outside measurement firm named beside the number, or a test you did not run.",
   "Paramount and AppLovin do this"),
 ("hash","Publish the test design","Here is exactly how the number was produced.",
   "The design printed on the page, next to the result.","Vizio and Tatari do this"),
 ("lock","Say what happens if you miss","If we miss the number, here is what you get.",
   "A remedy in writing, tied to a business result.","LG Ads and Simulmedia have done it")]

# --- 11 two sentences ---
SENT=[("01","The proof","What already happened",
   [("t","At "),("s","the client"),("t",", we delivered "),("s","the result"),
    ("t",", using "),("s","the method"),("t",", verified by "),
    ("s","an independent measurer"),("t",".")],
   [("The client","Who it happened to"),
    ("The result","The number, and what it is a number of"),
    ("The method","How the number was produced"),
    ("An independent measurer","The firm that checked it, and does not sell what you sell")]),
 ("02","The promise","What happens next time",
   [("t","If we miss "),("s","the number"),("t",", you get "),("s","the remedy"),("t",".")],
   [("The number","The threshold you will stand behind"),
    ("The remedy","What the advertiser gets if you miss")])]

# --- 12 the same two sentences, filled from one real page ---
FILLA=[("t","At "),("v","Ridge"),("t",", we delivered "),("v","128% above the iROAS goal"),
 ("t",", using "),("v","a three-week geo-holdout incrementality test"),
 ("t",", verified by "),("v","Haus, hired by Ridge"),("t",".")]
FILLB=[("t","If we miss "),("s","the number"),("t",", you get "),("s","the remedy"),("t",".")]
FILLASRC=("AppLovin &middot; applovin.com/en/resources/ridge","All four filled")
FILLBSRC=("Nobody","Not one of the 2,213 claims we read writes this sentence")
FILLNOTE=("Verbatim from the page: &ldquo;Ridge beats iROAS goal by 128%&rdquo; and "
 "&ldquo;Ridge partnered with Haus to run a three-week geo-holdout incrementality test "
 "measuring AppLovin&rsquo;s impact on sales of Ridge&rsquo;s power banks.&rdquo;")

# --- 12 limits ---
BOUND=[("01","The top rungs are thinly occupied.",
   "That describes the pages we read. An empty page is not proof of demand."),
 ("02","Companies selling results show their test more often.",
   "That is publishing practice. We did not measure honesty."),
 ("03","Plain language does not predict strong proof.",
   "Walled gardens use the plainest words and show a test on none of their claims."),
 ("04","Sellers have put money at risk before.",
   "Five times since 2011, each one narrow and conditioned."),
 ("05","The agentic comparison is directional.",
   "80 claims against 740, and not the same kind of sentence.")]

# --- 13 the record ---
DEEPER=[("The full read","22 sections &middot; 25 minutes",
   "Part of the supply chain by part, with every figure in place.","record/deep-dive.html"),
 ("The category notes","13 short reads","One per segment. Every number carries its link.","record/index.html#categories"),
 ("The second read","5 files &middot; 193 rows",
   "Every conclusion checked, with the limit written beside it.","record/index.html#adjudication"),
 ("The raw record","2,213 claims &middot; 627 pages",
   "Every claim word for word, with the page it came from.","record/index.html#data")]
CRED=("Company records, segment definitions and news history came from the <b>Marketecture "
 "Advertising Database</b>. Their API is what made a 140-company sample buildable in two days.")
METHOD=("<b>How to read this</b> &middot; 140 companies &middot; 627 pages &middot; 2,213 "
 "claims, each with its URL &middot; 740 about a business result &middot; 138 of the 140 read 16&ndash;17 "
 "September 2026 (two sites blocked capture) &middot; 64 companies re-read for agent claims on 30 September &middot; "
 "figures describe the pages we read, not the whole market &middot; Calidescope LLC.")

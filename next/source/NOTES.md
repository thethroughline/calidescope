# calidescope-situations_2.html — the designer's note, 8 September 2026

The idea: the arrows are the "therefore."

The situation card is already a sentence with an implied *but* — "You have somebody on the
inside making your case" … but … "you aren't sure how much weight they carry." Someone who has
just read an unresolved *but* is primed for a *therefore*. So the two horizontal arrows aren't
chrome bolted onto the story. They're the two therefores. Left is *therefore, if nothing
changes*. Right is *therefore, once it's fixed*. Navigation becomes the next clause of the
sentence the card just started.

Three rules came out of that.

1. **Labels name the destination, never the gesture.** Nothing says "swipe right." It says
   what's on the other side.
2. **A label appears only where the move opens new ground.** Retreat needs no name. The
   situation card is the only real fork, so it's the only card that gets both:
   `← when it doesn't work out | when it does →`. After that only the forward move is named:
   *how we do it*, then *a project in action*. Down always names the next situation by name.
3. **Colour maps to consequence; language stays in ink.** The arrows carry the colour — left
   resolves toward the dark ground it leads to, right to the row accent. The labels are always
   ink. Pink at label size on sand measures 3.05:1, which fails; the accent belongs on the
   stroke, not the sentence.

On mobile the horizontal axis is laid out horizontally at the bottom edge — arrow and label
flush left, label and arrow flush right — with the vertical axis centred below it. The geometry
teaches the geometry. Above 1100px each axis moves to the edge it points at.

The home screen teaches one move. Left and right aren't live there, so they aren't drawn. The
opening line is "Eight situations, and the two ways each one ends."

Typed arrows (→, ↗, ↓) were swapped for drawn ones in the same stroke weight as the icon set.

Flagged: at 1440px the content still hugs the left while the right-hand label sits at the far
edge. That is the existing asymmetry; centring the content block is the fix if desktop matters.

---

## Phone scale — 8 September, after the first look

Bret: the text and icons read small on a phone, and the headline sat as close to its subtext as
to the icon above it. Measured at 375×812: headline 29px, body 16px, icon 44px, kickers 11.5px,
and one 14px gap between every element.

Now, in a delimited block at the end of the stylesheet, for **phones narrower than 760px and taller
than 660px** — short phones keep the designer's compact rules: headline 33px, body 17px,
icon 54px, kickers 12px, nav labels 14px; icon → headline 16px, headline → subtext 22px. The
contact card scrolls rather than clips, since its height is the device's to decide.

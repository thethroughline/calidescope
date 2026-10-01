# -*- coding: utf-8 -*-
import sys, io
sys.path.insert(0, '/tmp/claude-0/oo')
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data import *

ICON={
 "quote":'<path d="M8.2 6.4C5.6 7.6 4.2 9.8 4.2 12.6c0 1.9 1.1 3 2.6 3s2.5-1 2.5-2.5-1-2.4-2.3-2.4c-.3 0-.6 0-.8.1.3-1.3 1.2-2.4 2.7-3.2ZM17.4 6.4c-2.6 1.2-4 3.4-4 6.2 0 1.9 1.1 3 2.6 3s2.5-1 2.5-2.5-1-2.4-2.3-2.4c-.3 0-.6 0-.8.1.3-1.3 1.2-2.4 2.7-3.2Z"/>',
 "hash":'<path d="M8.4 3.6 6.6 18.4M15.4 3.6l-1.8 14.8M3.8 8h14.4M3 14h14.4"/>',
 "user":'<circle cx="11" cy="8" r="3.2"/><path d="M4.6 18.2c.6-3.2 3.2-5 6.4-5s5.8 1.8 6.4 5"/>',
 "flask":'<path d="M9 3.2h4M9.6 3.2v5.1L4.9 16.2a1.6 1.6 0 0 0 1.4 2.4h9.4a1.6 1.6 0 0 0 1.4-2.4L12.4 8.3V3.2"/><path d="M7.2 13.2h7.6"/>',
 "stamp":'<path d="M11 2.8 3.8 6v5c0 4.2 3 7.5 7.2 8.4 4.2-.9 7.2-4.2 7.2-8.4V6Z"/><path d="M7.9 11.1 10.3 13.5l4-4.4"/>',
 "lock":'<rect x="4.4" y="9.6" width="13.2" height="8.6" rx="1.6"/><path d="M7.6 9.6V7.2a3.4 3.4 0 0 1 6.8 0v2.4"/>',
 "cart":'<path d="M3 4.2h2.6l2 9.1h8.3l1.7-6.4H6.2"/><circle cx="9" cy="16.6" r="1.4"/><circle cx="15.4" cy="16.6" r="1.4"/>',
 "receipt":'<path d="M5.2 3.4h11.6v15.2l-2.3-1.4-2.3 1.4-2.3-1.4-2.4 1.4-2.3-1.4Z"/><path d="M8.2 7.6h5.6M8.2 11h5.6"/>',
 "page":'<path d="M5.4 2.8h7l4.2 4.2v12.2H5.4Z"/><path d="M12.4 2.8V7h4.2"/><path d="M8 11.4h6M8 14.6h4.4"/>',
 "scale":'<path d="M11 3.6v14.8M5.6 18.4h10.8"/><path d="M4 7.6h14M4 7.6 1.8 13h4.4ZM18 7.6 15.8 13h4.4Z"/>',
}
def ico(k,cls="ic"):
    return ('<svg class="%s" viewBox="0 0 22 22" fill="none" stroke="currentColor" '
            'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" '
            'aria-hidden="true">%s</svg>')%(cls,ICON[k])
RCOL=["r0","r1","r2","r3","r4"]

# ---------- 2 what an outcome is ----------
def whatis():
    h='<div class="wi">'
    for k,t,d in WHATIS:
        h+=('<div class="wic"><span class="wii">%s</span><p class="wit">%s</p>'
            '<p class="wid">%s</p></div>')%(ico(k,"ic wii2"),t,d)
    h+='</div><div class="ws">'
    for fig,cap in WHOSAYS:
        h+='<div class="wsc"><p class="wsf">%s</p><p class="wsd">%s</p></div>'%(fig,cap)
    return h+'</div>'

# ---------- 3 the gap ----------
def gap():
    n,cap=GAPBIG
    h=('<div class="gp"><div class="gpn"><p class="gpf">%s</p><p class="gpc">%s</p></div>'
       '<div class="gpw"><p class="gpl">%s</p><div class="gpg">')%(n,cap,GAPLABEL)
    for t,who,d in GUAR:
        h+=('<div class="gc"><p class="gt">%s</p><p class="gw">%s</p><p class="gd">%s</p>'
            '</div>')%(t,who,d)
    return h+'</div></div></div>'

# ---------- 4 the precedent ----------
def seq():
    h=('<div class="sq"><div class="sqh"><em>What was sold</em><em>Who measured it</em>'
       '<em>What you got if it missed</em></div>')
    for i,(t,yr,m,g) in enumerate(SEQ):
        last=' open' if i==len(SEQ)-1 else ''
        h+=('<div class="sqr%s"><p class="sqt">%s<span>%s</span></p>'
            '<p class="sqa">&rarr;</p><p class="sqm">%s</p>'
            '<p class="sqa">&rarr;</p><p class="sqg">%s</p></div>')%(last,t,yr,m,g)
    return h+'</div>'

# ---------- 5 agents ----------
def agents():
    fig,cap=AGSTAT
    h=('<div class="ag1"><p class="agf">%s</p><p class="agc">%s</p></div>'
       '<div class="agq">')%(fig,cap)
    for where,txt,src in AGQ:
        last=' last' if 'contract' in where else ''
        h+=('<div class="agqc%s"><p class="agqh">%s</p><p class="agqt">&ldquo;%s&rdquo;</p>'
            '<p class="agqs">%s</p></div>')%(last,where,txt,src)
    return h+'</div>'

# ---------- 6 the study ----------
def study():
    h='<div class="proc">'
    for i,(k,t,d) in enumerate(STUDY):
        if i: h+='<div class="arw">&rarr;</div>'
        h+=('<div class="pbox"><span class="pi">%s</span><p class="pt3">%s</p>'
            '<p class="psd">%s</p></div>')%(ico(k,"ic pic"),t,d)
    return h+'</div>'

# ---------- 7 six claims ----------
def says():
    h='<div class="sy">'
    for k,i,co,txt,src,tag in SAYS:
        h+=('<div class="syc %s"><p class="syh">%s<span>%s</span></p>'
            '<p class="syt">&ldquo;%s&rdquo;</p>'
            '<p class="sys">%s<em>%s</em></p></div>')%(RCOL[i],ico(k,"ic syi"),co,txt,src,tag)
    co,txt,note=SAYSCAP
    return h+'</div>'+(('<div class="cap"><p class="caph">%s</p>'
     '<p class="capt">&ldquo;%s&rdquo;</p><p class="caps">%s</p></div>')%(co,txt,note))

# ---------- 8 the ladder ----------
def ladder():
    mx=max(n for _,_,_,n,_ in LADDER)
    h='<div class="lad">'
    for i,(k,name,gloss,n,near) in enumerate(LADDER):
        h+=('<div class="lr %s%s"><div class="lnw"><p class="ln">%s<span>%s</span></p>'
            '<p class="lg">%s</p></div>'
            '<div class="lb"><i style="width:%.1f%%"></i></div><p class="lv">%d</p>'
            '<p class="lk">%s</p></div>')%(RCOL[i],(' near' if i>=3 else '')+(' line' if i==3 else ''),
            ico(k,"ic lic"),name,gloss,100.0*n/mx,n,
            {0:'Take it on trust<span>670 claims</span>',
             3:'Check it yourself<span>70 claims</span>'}.get(i,''))
    return h+'</div>'

# ---------- 9 agentic ladder ----------
def agentic():
    h='<div class="ag">'
    for name,p in AGENTIC:
        h+=('<div class="agr%s"><p class="agt">%s</p>'
            '<div class="agb"><i style="width:%d%%"></i></div><p class="agv">%d%%</p></div>'
            )%(' empty' if p==0 else '',name,p,p)
    co,txt,note=AGTQ
    return h+'</div>'+(('<div class="tq"><p class="tqh">%s</p>'
     '<p class="tqt">&ldquo;%s&rdquo;</p><p class="tqs">%s</p></div>')%(co,txt,note))

# ---------- 10 positions ----------
def positions():
    h='<div class="ps">'
    for k,t,claim,proof,near in POS:
        h+=('<div class="pc"><span class="pi2">%s</span><p class="ptt">%s</p>'
            '<p class="pq">&ldquo;%s&rdquo;</p>'
            '<p class="pp"><span>What it takes</span>%s</p>'
            '<p class="pn">%s</p></div>')%(ico(k,"ic pic2"),t,claim,proof,near)
    return h+'</div>'

# ---------- 11 two sentences ----------
def template():
    h='<div class="tw">'
    for n,title,sub,sent,slots in SENT:
        h+=('<div class="tb"><p class="tbh"><b>%s</b> %s<span>%s</span></p><p class="tpl">'
            )%(n,title,sub)
        for kind,v in sent:
            h+=v if kind=="t" else '<span class="slot">%s</span>'%v
        h+='</p><div class="slg c%d">'%len(slots)
        for name,dsc in slots:
            h+=('<div class="slc"><p class="slt">%s</p><p class="sld">%s</p></div>'
                )%(name,dsc)
        h+='</div></div>'
    return h+'</div>'

# ---------- 12 filled in ----------
def filled():
    def line(parts):
        s=''
        for kind,v in parts:
            if kind=="t": s+=v
            elif kind=="v": s+='<span class="val">%s</span>'%v
            else: s+='<span class="slot">%s</span>'%v
        return s
    who,tag=FILLASRC
    h=('<div class="fw"><div class="fb done"><p class="fbh">%s<span>%s</span></p>'
       '<p class="fsent">%s</p></div>')%(who,tag,line(FILLA))
    who,tag=FILLBSRC
    h+=('<div class="fb todo"><p class="fbh">%s<span>%s</span></p>'
        '<p class="fsent">%s</p></div>')%(who,tag,line(FILLB))
    return h+'</div>'

# ---------- 12 limits ----------
def bounds():
    h='<div class="bd">'
    for n,a,b in BOUND:
        h+=('<div class="bc"><p class="bn">%s</p><p class="ba">%s</p><p class="bb">%s</p>'
            '</div>')%(n,a,b)
    return h+'</div>'

# ---------- 13 the record ----------
def deeper():
    h='<div class="dp">'
    for t,m,d,u in DEEPER:
        h+=('<a class="dr" href="%s"><p class="dt">%s</p><p class="dm">%s</p><p class="dd">%s</p>'
            '</a>')%(u,t,m,d)
    return h+'</div>'+('<p class="cred">%s</p>'%CRED)

# ---------- stages ----------
S=[dict(cover=True),
 dict(conn="The context",what="What advertisers are asking to buy",
   h1="Advertisers want to buy results.",
   h2="Everybody in the supply chain now says they sell them.",
   body=whatis(),sec="The context"),
 dict(conn="The gap",what="What those 740 claims actually promise",
   h1="Everybody sells outcomes.",h2="Almost nobody guarantees one.",
   body=gap(),sec="The context"),
 dict(conn="The precedent",what="Four times this industry changed what it sells",
   h1="This has happened four times before.",
   h2="The guarantee always came after an independent measurer.",
   body=seq(),fine=DONE,sec="The context"),
 dict(conn="What is new",what="Agents, sold as the way results get delivered",
   h1="Agents are the new pitch for delivering results.",
   h2="The contracts still say no guarantee.",
   body=agents(),sec="The context"),
 dict(conn="The study",what="What we did, September 2026",
   h1="We read 138 companies&rsquo; websites, word for word.",
   h2="One rule: what can a buyer check on the page?",
   body=study(),fine=STUDYNOTE,sec="The study"),
 dict(conn="What they say",what="Six results claims, exactly as published",
   h1="Here is what they actually say.",h2="Same promise. Very different backing.",
   body=says(),sec="The study"),
 dict(conn="The pattern",what="All 740 results claims, sorted by what a buyer can check",
   h1="Most claims stop at the number.",
   h2="Only 70 of 740 say how it was measured, or who checked it.",
   body=ladder(),fine=LADFINE,sec="The study"),
 dict(conn="The newer claims",what="80 agent claims, read exactly the same way",
   h1="Agent claims have even less behind them.",
   h2="Not one names an outside measurement firm.",
   body=agentic(),fine=AGFINE,sec="The study"),
 dict(conn="The opportunity",what="Four positions, and what each one takes",
   h1="Four positions nobody has taken.",
   h2="Each one takes a single piece of published proof.",
   body=positions(),sec="The opportunity"),
 dict(conn="The first move",what="The claim you already lead with, rewritten",
   h1="A claim a buyer can check",h2="is really two sentences.",
   body=template(),sec="The opportunity"),
 dict(conn="What good looks like",what="The same two sentences, filled from one real page",
   h1="The best claim we read writes the first.",h2="Nobody writes the second.",
   body=filled(),fine=FILLNOTE,sec="The opportunity"),
 dict(conn="The limits",dark=True,what="What an outside reviewer would not let us say",
   h1="What we cannot claim",h2="from this evidence.",body=bounds(),sec="The opportunity"),
 dict(conn="The record",what="Everything behind these thirteen slides",
   h1="Check any number in here.",h2="All of it is open.",
   body=deeper(),method=True,sec="The opportunity")]

SECS=["The context","The study","The opportunity"]

def stage(s,i):
    n=i+1; tot=len(S)
    cls="stage"+(" dark" if s.get("dark") else "")+(" cvr" if s.get("cover") else "")
    h='<section class="%s"><div class="inner">'%cls
    if s.get("cover"):
        h+=('<p class="eye">The outcomes opportunity</p><div class="grow"></div>'
            '<h1 class="big">%s<br><span class="ac">%s</span></h1>'
            '<p class="csub">%s</p><div class="grow"></div>'
            '<p class="mono fn">138 companies read page by page &middot; September 2026 '
            '&middot; Calidescope LLC</p>')%COVER
    else:
        h+='<div class="hd"><p class="eye"><b>%s</b> &middot; %s</p></div>'%(
            s["conn"],s["what"])
        h+='<h1><span class="k">%s</span> <span class="ac">%s</span></h1>'%(s["h1"],s["h2"])
        h+='<div class="mid">'+s["body"]
        if s.get("fine"): h+='<p class="fine">%s</p>'%s["fine"]
        if s.get("method"): h+='<p class="meth">%s</p>'%METHOD
        h+='</div>'
    lab=s.get("sec","The context")
    dots=''.join('<i class="%s"></i>'%('on' if (lab==x or (s.get("cover") and x==SECS[0]))
                 else '') for x in SECS)
    h+=('<div class="foot"><span class="dots">%s</span><span class="mono">%s</span>'
        '<span class="mono pg">%d/%d</span></div>')%(dots,lab,n,tot)
    return h+'</div></section>'

CSS=r"""
:root{--paper:#FAF7EF;--desk:#EFEBE1;--sand:#F3EEE2;--hair:#E4E0D6;--ink:#1F2024;
 --muted:#63605A;--dim:#63605A;--blue:#1E40FF;--tint:#DDE6FF;--grey:#8A857C;--greyt:#6B665D;
 --r0:#B5AFA4;--r1:#8E9AB8;--r2:#5568D6;--r3:#1E40FF;--r4:#0A1A5C;
 --arch:"Archivo","Helvetica Neue",Helvetica,Arial,sans-serif;
 --mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--desk);color:var(--ink);font-family:var(--arch);
 -webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
::selection{background:var(--tint);color:var(--ink)}
:focus-visible{outline:2px solid var(--blue);outline-offset:3px}
.wrap{max-width:1180px;margin:0 auto;padding:34px 24px 60px}
.stage{position:relative;aspect-ratio:16/9;background:var(--paper);border:1px solid var(--hair);
 border-radius:3px;margin:0 0 26px;box-shadow:0 1px 3px rgba(31,32,36,.06);overflow:hidden}
.inner{position:absolute;inset:0;padding:40px 52px 30px;display:flex;flex-direction:column}
.grow{flex:1 1 auto;min-height:0}
.mid{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center}
.mono{font-family:var(--mono)}
.eye{font-family:var(--mono);font-size:12.5px;letter-spacing:.03em;color:var(--muted);margin:0}
.eye b{color:var(--blue);font-weight:600}
.dark .eye b{color:var(--tint)}
.hd{margin:0 0 12px}
h1{font-size:36px;line-height:1.3;font-weight:600;letter-spacing:-.022em;margin:0 0 22px;
 max-width:44ch}
.fine{font-family:var(--mono);font-size:11.5px;line-height:1.6;color:var(--dim);margin:14px 0 0;
 max-width:100ch}
.fine b{color:var(--ink);font-weight:500}
h1 .k{color:var(--ink)}
.ac{color:var(--blue)}
.big{font-size:54px;line-height:1.08;max-width:20ch;margin:0 0 24px}
.fn{font-size:12.5px;color:var(--dim);margin:0}
.say{font-size:15px;line-height:1.55;color:var(--muted);margin:14px 0 0;max-width:92ch}
.say.big{font-size:20px;line-height:1.4;color:var(--ink);font-weight:500;letter-spacing:-.014em;
 border-left:2px solid var(--blue);padding-left:17px;margin:16px 0 0;max-width:82ch}
.say.big b{font-weight:700}
.note{font-family:var(--mono);font-size:11.5px;line-height:1.6;color:var(--dim);margin:11px 0 0;
 max-width:96ch}
.stat{font-size:15px;line-height:1.5;color:var(--muted);margin:11px 0 0;max-width:92ch}
.stat b{color:var(--ink);font-weight:600}
.meth{font-family:var(--mono);font-size:11px;line-height:1.62;color:var(--dim);margin:14px 0 0}
.meth b{color:var(--ink)}
.dark .meth{color:#B4AFA4}
.dark .meth b{color:var(--paper)}
.ic{width:22px;height:22px;display:block}
/* 2 sequence */
.sq{display:flex;flex-direction:column;gap:1px}
.sqh{display:grid;grid-template-columns:230px 26px 1fr 26px 1fr;gap:16px;padding:0 0 8px;
 border-bottom:1px solid var(--ink)}
.sqh em{font-style:normal;font-family:var(--mono);font-size:12px;letter-spacing:.02em;
 color:var(--muted)}
.sqh em:nth-of-type(1){grid-column:1}
.sqh em:nth-of-type(2){grid-column:3}
.sqh em:nth-of-type(3){grid-column:5}
.sqr{display:grid;grid-template-columns:230px 26px 1fr 26px 1fr;gap:16px;align-items:center;
 padding:12px 0;border-bottom:1px solid var(--hair)}
.sqr.open{background:var(--tint);margin:2px -12px 0;padding:14px 12px;border-bottom:0;
 border-top:1px solid var(--blue)}
.sqt{font-size:18px;font-weight:600;margin:0;letter-spacing:-.014em}
.sqt span{display:block;font-family:var(--mono);font-size:11.5px;font-weight:400;
 color:var(--muted);letter-spacing:.02em;margin-top:2px}
.sqa{margin:0;color:var(--greyt);font-size:15px;text-align:center}
.sqr.open .sqa{color:var(--blue)}
.sqm,.sqg{font-size:15px;color:var(--muted);margin:0}
.sqr.open .sqm,.sqr.open .sqg{color:var(--blue);font-weight:600}
/* 3 ladder */
.lad{display:flex;flex-direction:column;gap:1px}
.lr{display:grid;grid-template-columns:330px 1fr 54px 168px;gap:20px;align-items:center;
 padding:7px 0;border-bottom:1px solid var(--hair)}
.lg{font-size:12.5px;line-height:1.38;color:var(--muted);margin:2px 0 0 31px}
.lr.near .lg{color:var(--ink)}
.lr:first-child{border-top:1px solid var(--ink)}
.lr.near{background:var(--tint);margin:0 -12px;padding:11px 12px}
.lr.line{border-top:2px solid var(--blue)}
.ln{display:flex;align-items:center;gap:11px;font-size:15.5px;font-weight:600;margin:0;
 letter-spacing:-.01em}
.lic{width:20px;height:20px;flex:0 0 20px}
.r0 .lic{color:var(--r0)}.r1 .lic{color:var(--r1)}.r2 .lic{color:var(--r2)}
.r3 .lic{color:var(--r3)}.r4 .lic{color:var(--r4)}
.lb{height:16px;background:var(--desk);border-radius:2px;overflow:hidden}
.lr.near .lb{background:rgba(255,255,255,.6)}
.lb i{display:block;height:100%;border-radius:2px;background:var(--grey)}
.lr.near .lb i{background:var(--blue)}
.lr.r3 .lb i,.lr.r4 .lb i{background:var(--r4)}
.lv{font-family:var(--mono);font-size:17px;font-weight:600;margin:0;text-align:right}
.lk{font-family:var(--mono);font-size:12px;color:var(--ink);margin:0;letter-spacing:.02em;font-weight:500}
.lk span{display:block;color:var(--dim);font-weight:400;margin-top:3px}
.lr.near .lk{color:var(--blue);font-weight:600}
.lr.r3 .lk,.lr.r4 .lk{color:var(--r4)}
/* 3 what the market says */
.sy{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.syc{background:var(--sand);border:1px solid var(--hair);border-radius:3px;padding:14px 15px 15px;
 display:flex;flex-direction:column}
.syh{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;font-weight:600;
 letter-spacing:-.008em}
.syi{width:17px;height:17px;flex:0 0 17px}
.r0 .syi{color:var(--r0)}.r1 .syi{color:var(--r1)}.r2 .syi{color:var(--r2)}
.r3 .syi{color:var(--r3)}.r4 .syi{color:var(--r4)}
.syt{font-size:13.5px;line-height:1.45;margin:0 0 11px;color:var(--ink);flex:1 1 auto}
.sys{font-family:var(--mono);font-size:11.5px;color:var(--dim);margin:0;line-height:1.5;
 border-top:1px solid var(--hair);padding-top:9px}
.sys em{display:block;font-style:normal;color:var(--blue);margin-top:3px}
.cap{background:var(--tint);border:1px solid var(--blue);border-radius:3px;
 padding:14px 18px 15px;margin:13px 0 0}
.caph{font-family:var(--mono);font-size:11.5px;letter-spacing:.03em;color:var(--blue);margin:0 0 7px}
.capt{font-size:15.5px;line-height:1.45;margin:0 0 7px;color:var(--ink)}
.caps{font-family:var(--mono);font-size:11.5px;color:var(--dim);margin:0;line-height:1.5}
/* 5 agentic */
.ag{display:flex;flex-direction:column;gap:1px}
.agr{display:grid;grid-template-columns:230px 1fr 54px;gap:20px;align-items:center;
 padding:9px 0;border-bottom:1px solid var(--hair)}
.agr:first-child{border-top:1px solid var(--ink)}
.agr.empty{background:var(--tint);margin:0 -12px;padding:11px 12px}
.agt{font-size:15px;font-weight:500;margin:0}
.agr.empty .agt{color:var(--blue);font-weight:600}
.agb{height:14px;background:var(--desk);border-radius:2px;overflow:hidden}
.agr.empty .agb{background:rgba(255,255,255,.6)}
.agb i{display:block;height:100%;border-radius:2px;background:var(--grey)}
.agv{font-family:var(--mono);font-size:14px;font-weight:600;margin:0;text-align:right}
.agr.empty .agv{color:var(--blue)}
/* 7 positions */
.ps{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.pc{background:var(--sand);border:1px solid var(--hair);border-radius:3px;padding:19px 19px 20px;
 display:flex;flex-direction:column}

.pic2{width:24px;height:24px;color:var(--blue);margin-bottom:13px}
.ptt{font-size:19px;font-weight:600;letter-spacing:-.016em;margin:0 0 10px;line-height:1.3}
.pq{font-size:14.5px;line-height:1.4;color:var(--ink);margin:0 0 13px;min-height:58px}
.pp{font-size:13px;line-height:1.45;color:var(--muted);margin:0 0 10px;
 border-top:1px solid var(--hair);padding-top:11px;flex:1 1 auto}
.pp span{display:block;font-family:var(--mono);font-size:11.5px;letter-spacing:.03em;
 color:var(--dim);margin-bottom:5px}
.pn{font-family:var(--mono);font-size:11.5px;color:var(--blue);margin:0;line-height:1.45}
/* 8 plan */
.pl{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.pcell{background:var(--sand);border:1px solid var(--hair);border-radius:3px;
 padding:22px 22px 24px;display:flex;flex-direction:column}
.pln{font-family:var(--mono);font-size:12px;color:var(--blue);margin:0 0 12px;letter-spacing:.04em}
.plt{font-size:20px;font-weight:600;letter-spacing:-.018em;margin:0 0 16px;line-height:1.3;
 min-height:52px}
.plf{font-size:32px;font-weight:600;color:var(--blue);letter-spacing:-.028em;line-height:1;
 margin:0 0 8px}
.plb{font-size:14px;line-height:1.45;color:var(--muted);margin:0;border-top:1px solid var(--hair);
 padding-top:12px;flex:1 1 auto}
/* 10 dive deeper */
.dp{border-top:1px solid var(--ink)}
a.dr{text-decoration:none;color:inherit}
a.dr:hover .dt,a.dr:focus-visible .dt{color:var(--blue)}
.dr{display:grid;grid-template-columns:230px 200px 1fr;gap:26px;padding:11px 0;
 border-bottom:1px solid var(--hair);align-items:baseline}
.dt{font-size:16px;font-weight:600;margin:0;letter-spacing:-.01em}
.dm{font-family:var(--mono);font-size:12.5px;color:var(--blue);margin:0}
.dd{font-size:14.5px;color:var(--muted);margin:0}
.cred{font-size:13px;line-height:1.5;color:var(--muted);margin:16px 0 0;max-width:96ch;
 border-top:1px solid var(--hair);padding-top:13px}
.cred b{color:var(--ink);font-weight:600}
/* 2 what an outcome is */
.wi{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.wic{background:var(--sand);border:1px solid var(--hair);border-radius:3px;padding:18px 18px 20px}
.wii2{width:24px;height:24px;color:var(--blue);margin-bottom:12px}
.wit{font-size:19px;font-weight:600;margin:0 0 6px;letter-spacing:-.014em}
.wid{font-size:13.5px;line-height:1.45;color:var(--muted);margin:0}
.ws{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin:20px 0 0;
 border-top:1px solid var(--ink);padding-top:16px}
.wsf{font-size:32px;font-weight:600;letter-spacing:-.026em;line-height:1;margin:0 0 7px;
 color:var(--blue)}
.wsd{font-size:14.5px;line-height:1.45;color:var(--muted);margin:0}
/* 3 the gap */
.gp{display:grid;grid-template-columns:280px 1fr;gap:34px;align-items:start}
.gpn{background:var(--tint);border:1px solid var(--blue);border-radius:3px;padding:22px 22px 24px}
.gpf{font-size:76px;font-weight:600;color:var(--blue);letter-spacing:-.035em;line-height:.95;
 margin:0 0 12px}
.gpc{font-size:15px;line-height:1.45;color:var(--ink);margin:0}
.gpg{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}
.gc{background:var(--sand);border:1px solid var(--hair);border-radius:3px;padding:15px 16px 16px}
.gt{font-size:17px;font-weight:600;margin:0 0 3px;letter-spacing:-.012em}
.gw{font-family:var(--mono);font-size:11.5px;color:var(--blue);margin:0 0 8px}
.gd{font-size:13.5px;line-height:1.45;color:var(--muted);margin:0}
.pt2{font-size:19px;line-height:1.4;color:var(--ink);font-weight:500;margin:18px 0 0;
 border-left:2px solid var(--blue);padding-left:17px;letter-spacing:-.012em;max-width:88ch}
/* 5 agents */
.ag1{display:grid;grid-template-columns:220px 1fr;gap:24px;align-items:center;margin:0 0 16px;
 padding-bottom:16px;border-bottom:1px solid var(--ink)}
.agf{font-size:38px;font-weight:600;color:var(--blue);letter-spacing:-.028em;line-height:1;
 margin:0}
.agc{font-size:16px;line-height:1.45;color:var(--ink);margin:0;max-width:74ch}
.agq{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.agqc{background:var(--sand);border:1px solid var(--hair);border-radius:3px;padding:16px 17px 17px;
 display:flex;flex-direction:column}
.agqc.last{background:var(--tint);border-color:var(--blue)}
.agqh{font-family:var(--mono);font-size:11.5px;letter-spacing:.03em;color:var(--blue);margin:0 0 10px}
.agqt{font-size:14.5px;line-height:1.45;color:var(--ink);margin:0;flex:1 1 auto}
.agqs{font-family:var(--mono);font-size:11.5px;color:var(--dim);margin:11px 0 0}
/* 6 the study */
.proc{display:flex;align-items:stretch}
.pbox{flex:1;background:var(--sand);border:1px solid var(--hair);border-radius:3px;
 padding:18px 18px 20px}
.pic{width:24px;height:24px;color:var(--blue);margin-bottom:12px}
.pt3{font-size:18px;font-weight:600;margin:0 0 6px;letter-spacing:-.014em}
.psd{font-size:13.5px;line-height:1.45;color:var(--muted);margin:0}
.arw{display:flex;align-items:center;padding:0 13px;color:var(--greyt);font-size:16px}
/* 9 agentic Tatari card */
.tq{background:var(--sand);border:1px solid var(--hair);border-radius:3px;
 padding:14px 18px 15px;margin:14px 0 0}
.tqh{font-family:var(--mono);font-size:11.5px;letter-spacing:.03em;color:var(--blue);margin:0 0 8px}
.tqt{font-size:15px;line-height:1.45;margin:0 0 8px;color:var(--ink)}
.tqs{font-family:var(--mono);font-size:11.5px;color:var(--dim);margin:0;line-height:1.5}
/* 3 gap label */
.gpw{display:flex;flex-direction:column}
.gpl{font-family:var(--mono);font-size:11.5px;letter-spacing:.03em;color:var(--muted);
 margin:0 0 12px;padding-bottom:9px;border-bottom:1px solid var(--ink)}
/* 11 two sentences */
.tw{display:flex;flex-direction:column;gap:22px}
.tb{border-top:1px solid var(--ink);padding-top:14px}
.tbh{font-size:17px;font-weight:600;margin:0 0 14px;letter-spacing:-.012em}
.tbh b{font-family:var(--mono);font-size:12px;color:var(--blue);font-weight:600;
 margin-right:10px;letter-spacing:.04em}
.tbh span{font-weight:400;color:var(--muted);margin-left:9px;font-size:15px}
.tpl{font-size:25px;line-height:1.75;font-weight:500;letter-spacing:-.016em;color:var(--ink);
 margin:0 0 16px}
.slot{display:inline-block;background:var(--tint);border:1px dashed var(--blue);border-radius:0;
 color:var(--blue);font-family:var(--mono);font-size:17px;font-weight:500;
 padding:1px 9px 2px;margin:0 2px}
.slg{display:grid;gap:16px}
.slg.c4{grid-template-columns:repeat(4,1fr)}
.slg.c2{grid-template-columns:repeat(2,1fr);max-width:62%}
.slt{font-size:14.5px;font-weight:600;margin:0 0 3px;letter-spacing:-.008em}
.sld{font-size:13px;line-height:1.45;color:var(--muted);margin:0}
/* 12 filled */
.fw{display:flex;flex-direction:column;gap:20px}
.fb{border-radius:3px;padding:22px 26px 24px}
.fb.done{background:var(--sand);border:1px solid var(--hair)}
.fb.todo{background:var(--tint);border:1px solid var(--blue)}
.fbh{font-family:var(--mono);font-size:12.5px;color:var(--blue);margin:0 0 14px;
 letter-spacing:.02em}
.fbh span{color:var(--dim);margin-left:12px}
.fsent{font-size:28px;line-height:1.66;font-weight:500;letter-spacing:-.018em;color:var(--ink);
 margin:0}
.val{color:var(--blue);font-weight:600}
.fb.todo .slot{background:var(--paper)}
/* 9 boundaries */
.bd{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
.bc{border-top:1px solid rgba(250,247,239,.24);padding-top:14px}
.bn{font-family:var(--mono);font-size:11.5px;color:#B4AFA4;margin:0 0 10px}
.ba{font-size:15.5px;line-height:1.35;font-weight:600;color:var(--paper);margin:0 0 10px}
.bb{font-size:13.5px;line-height:1.5;color:#B4AFA4;margin:0}
.dark{background:var(--ink);border-color:var(--ink)}
.dark h1 .k{color:var(--paper)}
.dark .ac{color:var(--tint)}
.dark .eye{color:#B4AFA4}
.dark .foot{border-top-color:rgba(250,247,239,.14);color:#B4AFA4}
.dark .dots i{background:#3A3A3E}
.dark .dots i.on{background:var(--tint)}
/* cover + foot */
.cvr{background:var(--ink);border-color:var(--ink)}
.cvr .eye,.cvr .fn{color:#B4AFA4}
.cvr h1{color:var(--paper)}
.cvr .ac{color:var(--tint)}
.csub{font-size:19px;line-height:1.5;color:#B4AFA4;margin:0;max-width:52ch}
.cvr .foot{border-top-color:rgba(250,247,239,.14)}
.foot{display:flex;align-items:center;gap:14px;border-top:1px solid var(--hair);
 padding-top:12px;margin-top:auto;font-size:12.5px;color:var(--dim)}
.dots{display:flex;gap:5px}
.dots i{width:6px;height:6px;border-radius:50%;background:var(--hair);display:block}
.dots i.on{background:var(--blue)}
.pg{margin-left:auto}
.cvr .dots i{background:#3A3A3E}.cvr .dots i.on{background:var(--tint)}
@media(max-width:1100px){
 .stage{aspect-ratio:auto;min-height:0}
 .inner{position:static;padding:26px 16px 20px}
 h1{font-size:26px;margin-bottom:18px}.big{font-size:32px}
 .say.big{font-size:17px}
 .sy,.ps,.pl,.bd,.dr,.wi,.ws,.gpg,.agq,.slg{grid-template-columns:1fr}
 .flh{display:none}
 .flr{grid-template-columns:1fr;gap:6px}
 .tpl{font-size:18px;line-height:2}
 .slot{font-size:14px}
 .slg.c4,.slg.c2{grid-template-columns:1fr;max-width:none}
 .fsent{font-size:19px;line-height:1.7}
 .fb{padding:16px 16px 18px}
 .gp,.ag1{grid-template-columns:1fr;gap:14px}
 .proc{flex-direction:column;gap:10px}
 .arw{display:none}
 .pt2{font-size:17px}
 .sqh,.aph{display:none}
 .sqr,.lr,.agr,.ar{grid-template-columns:1fr;gap:6px;text-align:left}
 .sqa{display:none}
 .lr .lb,.lr .lv{display:none}
 .vlab{position:static;text-align:left!important}
 .vlab.lb .vd{margin-left:0}
 .vwrap{flex-direction:column;gap:14px}
 .vn{display:none}
}
"""

FR=''.join(stage(s,i) for i,s in enumerate(S))
HTML=("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
"<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
"<title>The Outcomes Opportunity</title>"
"<link rel=\"icon\" href=\"/assets/favicon.svg\" type=\"image/svg+xml\">"
"<link rel=\"stylesheet\" href=\"/assets/fonts/fonts.css\">"
"<style>"+CSS+"</style></head><body><div class=\"wrap\">"+FR+"</div></body></html>")
OUT=sys.argv[1] if len(sys.argv)>1 else 'The_Outcomes_Opportunity.html'
io.open(OUT,'w',encoding='utf-8').write(HTML)
print(OUT, len(HTML.encode('utf-8')), 'bytes')
print('stages',len(S),'bytes',len(HTML))

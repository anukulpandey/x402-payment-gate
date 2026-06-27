#!/usr/bin/env python3
"""
Generate the GateKeep investor pitch deck (.pptx).

Brand-matched to the web app: near-black background (#06060B) with an indigo
accent (#6366F1) and the shield/check logo tile.

Run with the venv that has python-pptx:
    /tmp/deckenv/bin/python scripts/build_pitch_deck.py
Output: docs/GateKeep-Investor-Deck.pptx
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

# ── palette ────────────────────────────────────────────────────────────────
BG      = RGBColor(0x06, 0x06, 0x0B)
PANEL   = RGBColor(0x13, 0x13, 0x1E)
PANEL2  = RGBColor(0x1B, 0x1B, 0x2A)
ACCENT  = RGBColor(0x63, 0x66, 0xF1)
ACCENT2 = RGBColor(0x81, 0x8C, 0xF8)
ACCENTL = RGBColor(0xA5, 0xB4, 0xFC)
WHITE   = RGBColor(0xEE, 0xF2, 0xFF)
MUTED   = RGBColor(0x9A, 0xA3, 0xC0)
FAINT   = RGBColor(0x5A, 0x60, 0x7A)
GREEN   = RGBColor(0x34, 0xD3, 0x99)
AVAX    = RGBColor(0xE8, 0x41, 0x42)

FONT = "Helvetica Neue"

# ── geometry ───────────────────────────────────────────────────────────────
SW, SH = 13.333, 7.5
ML = 0.95          # left margin
MR = 0.95
CW = SW - ML - MR  # content width

prs = Presentation()
prs.slide_width  = Inches(SW)
prs.slide_height = Inches(SH)
BLANK = prs.slide_layouts[6]


# ── helpers ────────────────────────────────────────────────────────────────
def slide(bg=BG):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = bg
    return s


def _set_radius(shape, r):
    try:
        shape.adjustments[0] = r
    except Exception:
        pass


def rect(s, x, y, w, h, fill=None, line=None, line_w=1.0, rounded=False, radius=0.08):
    shp = s.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded:
        _set_radius(shp, radius)
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line; shp.line.width = Pt(line_w)
    shp.shadow.inherit = False
    return shp


def _norm(runs):
    """Normalize `runs` into a list of paragraphs; each paragraph is a list of
    (text, overrides) tuples.

    Accepts: a plain string; a list of paragraphs where each paragraph is a
    string, a (text, ov) tuple, or a list of strings/tuples; or a single
    paragraph expressed as a list of (text, ov) tuples."""
    if isinstance(runs, str):
        return [[(runs, {})]]
    if runs and all(isinstance(x, tuple) for x in runs):     # single styled paragraph
        return [list(runs)]
    paras = []
    for para in runs:
        if isinstance(para, str):
            paras.append([(para, {})])
        elif isinstance(para, tuple):
            paras.append([para])
        elif isinstance(para, list):
            chunk = [(c, {}) if isinstance(c, str) else c for c in para]
            paras.append(chunk)
        else:
            paras.append([(str(para), {})])
    return paras


def text(s, x, y, w, h, runs, size=18, color=WHITE, bold=False, italic=False,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font=FONT, spacing=1.0,
         space_after=0):
    """runs: a string, or list of (string, dict-overrides) for inline styling."""
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    for m in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, m, 0)
    for i, para in enumerate(_norm(runs)):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        if space_after:
            p.space_after = Pt(space_after)
        for tx, ov in para:
            r = p.add_run(); r.text = tx
            f = r.font
            f.name = ov.get("font", font)
            f.size = Pt(ov.get("size", size))
            f.bold = ov.get("bold", bold)
            f.italic = ov.get("italic", italic)
            f.color.rgb = ov.get("color", color)
    return tb


def kicker(s, label):
    text(s, ML, 0.62, CW, 0.35, label.upper(), size=13, color=ACCENT2, bold=True)
    # small accent tick under kicker
    rect(s, ML, 0.98, 0.55, 0.045, fill=ACCENT)


def heading(s, title, size=37, w=None, color=WHITE):
    text(s, ML, 1.12, w or CW, 1.4, title, size=size, color=color, bold=True, spacing=1.02)


def footer(s, n):
    text(s, ML, SH - 0.5, 4, 0.3, "GateKeep", size=10.5, color=FAINT, bold=True)
    text(s, SW - MR - 1.2, SH - 0.5, 1.2, 0.3, f"{n:02d}", size=10.5, color=FAINT,
         align=PP_ALIGN.RIGHT)


def logo(s, x, y, side=0.95):
    tile = rect(s, x, y, side, side, fill=ACCENT, rounded=True, radius=0.30)
    # soft second tone
    rect(s, x, y, side, side * 0.5, fill=ACCENT2, rounded=True, radius=0.30)
    text(s, x, y, side, side, "✓", size=int(side * 46), color=WHITE, bold=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    return tile


def cards(s, items, y=2.7, h=3.4, top_accent=True, num=False):
    """items: list of (title, body). Lays out evenly across content width."""
    n = len(items)
    gap = 0.35
    w = (CW - gap * (n - 1)) / n
    for i, (t, body) in enumerate(items):
        x = ML + i * (w + gap)
        rect(s, x, y, w, h, fill=PANEL, line=PANEL2, line_w=1.0, rounded=True, radius=0.06)
        if top_accent:
            rect(s, x + 0.0, y, w, 0.09, fill=ACCENT, rounded=True, radius=0.5)
        pad = 0.32
        ty = y + 0.34
        if num:
            text(s, x + pad, ty, w - 2 * pad, 0.5, f"{i+1:02d}", size=15, color=ACCENT2, bold=True)
            ty += 0.46
        text(s, x + pad, ty, w - 2 * pad, 0.9, t, size=18.5, color=WHITE, bold=True, spacing=1.03)
        text(s, x + pad, ty + 0.78, w - 2 * pad, h - (ty - y) - 1.0, body,
             size=13.5, color=MUTED, spacing=1.16)


# ════════════════════════════════════════════════════════════════════════════
# 1 — TITLE
# ════════════════════════════════════════════════════════════════════════════
s = slide()
# faint accent band on the right
rect(s, SW - 0.22, 0, 0.22, SH, fill=ACCENT)
logo(s, ML, 2.35, 1.15)
text(s, ML + 1.45, 2.35, 8, 1.2, "GateKeep", size=62, color=WHITE, bold=True,
     anchor=MSO_ANCHOR.MIDDLE)
text(s, ML, 3.75, 11, 0.7, "Stripe for the agent economy", size=27, color=ACCENTL)
text(s, ML, 4.55, 11, 0.6,
     "The payment rail AI agents use to pay for APIs — automatically, per call, in stablecoins.",
     size=16, color=MUTED, spacing=1.2)
rect(s, ML, 5.6, 0.55, 0.05, fill=ACCENT)
text(s, ML, 5.78, 11, 0.4,
     [[("Investor Pitch", {"color": WHITE, "bold": True, "size": 13}),
       ("    ·    Built on Avalanche    ·    Live on-chain demo    ·    2026", {"color": MUTED, "size": 13})]])

# ════════════════════════════════════════════════════════════════════════════
# 2 — THE SHIFT (big statement)
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "The shift")
text(s, ML, 2.5, CW, 2.6,
     [[("The internet was built to be paid for by ", {"color": WHITE, "size": 40, "bold": True}),
       ("humans.", {"color": MUTED, "size": 40, "bold": True})],
      [("The buyer just became a ", {"color": WHITE, "size": 40, "bold": True}),
       ("machine.", {"color": ACCENT2, "size": 40, "bold": True})]],
     spacing=1.1)
text(s, ML, 5.3, CW, 1.0,
     "Autonomous agents now do real work — and real work means paying for things. "
     "But every payment rail on the internet assumes a human is holding the card.",
     size=17, color=MUTED, spacing=1.25)
footer(s, 2)

# ════════════════════════════════════════════════════════════════════════════
# 3 — THE PROBLEM
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "The problem")
heading(s, "Agents can’t pay the way humans do")
cards(s, [
    ("Human rails break for agents",
     "Credit cards need a cardholder. SaaS plans need a signup. API keys need a human to provision and rotate. None of it works for software making thousands of calls across services it discovered seconds ago."),
    ("Pricing is mismatched",
     "Agent traffic is high-volume, low-value-per-call. Monthly subscriptions and $50 minimums don’t fit a workload that wants to spend a tenth of a cent per request."),
    ("No trust layer",
     "When the buyer is a piece of software, “who is this agent, and can I trust it?” has no answer today. Sellers either block all bots — or get abused by them."),
], y=2.75, h=3.55)
footer(s, 3)

# ════════════════════════════════════════════════════════════════════════════
# 4 — WHY NOW
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "Why now")
heading(s, "Three things just became true at once")
cards(s, [
    ("x402 is real",
     "The dormant HTTP 402 “Payment Required” status code is now an open protocol for machine-native payments. Payment becomes a property of the request itself — no checkout, no account."),
    ("Stablecoins + gasless transfers",
     "Sub-cent, instant, global settlement is finally viable. With EIP-3009 the agent just signs — the transfer costs it zero gas. Micropayments actually work."),
    ("Agents became buyers",
     "2025–26 is when agents went from demos to doing real work. The buyer on the other end of the API changed from a human to a machine — and the payment stack hasn’t caught up."),
], y=2.75, h=3.55, num=True, top_accent=False)
footer(s, 4)

# ════════════════════════════════════════════════════════════════════════════
# 5 — THE SOLUTION
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "The solution")
heading(s, "Wrap any API behind a per-call paywall — in one click")
# two side panels: seller / agent
gap = 0.4
w = (CW - gap) / 2
y, h = 2.85, 2.55
# seller
rect(s, ML, y, w, h, fill=PANEL, line=PANEL2, rounded=True, radius=0.05)
rect(s, ML, y, w, 0.09, fill=ACCENT, rounded=True, radius=0.5)
text(s, ML + 0.34, y + 0.3, w - 0.68, 0.5, "For the API owner", size=18.5, color=WHITE, bold=True)
text(s, ML + 0.34, y + 0.92, w - 0.68, h - 1.1,
     [["Paste your API URL.  Set a price — say $0.01 / call."],
      ["Get a gated URL back. Done."],
      ["Earnings settle on-chain; withdraw to your wallet anytime."]],
     size=14.5, color=MUTED, spacing=1.2, space_after=8)
# agent
x2 = ML + w + gap
rect(s, x2, y, w, h, fill=PANEL, line=PANEL2, rounded=True, radius=0.05)
rect(s, x2, y, w, 0.09, fill=GREEN, rounded=True, radius=0.5)
text(s, x2 + 0.34, y + 0.3, w - 0.68, 0.5, "For the agent developer", size=18.5, color=WHITE, bold=True)
text(s, x2 + 0.34, y + 0.92, w - 0.68, h - 1.1,
     [["Add one line: a payment-aware fetch wrapper."],
      ["The agent gets a 402, signs a USDC payment, retries, gets the data."],
      ["No accounts, no API keys, no invoices — ever."]],
     size=14.5, color=MUTED, spacing=1.2, space_after=8)
text(s, ML, 5.8, CW, 0.8,
     [[("We settle every call on-chain, take our cut, and pay the seller their share. ", {"color": WHITE, "size": 16}),
       ("Like Stripe — for machine traffic.", {"color": ACCENT2, "size": 16, "bold": True})]],
     spacing=1.2)
footer(s, 5)

# ════════════════════════════════════════════════════════════════════════════
# 6 — HOW IT WORKS (flow)
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "How it works")
heading(s, "One request. One round trip. Fully automatic.")
steps = [
    ("Call", "Agent calls the gated URL with no payment."),
    ("402", "GateKeep replies “Payment Required” with a price quote."),
    ("Sign", "Agent signs a gasless USDC authorization and retries."),
    ("Settle", "We verify, settle on-chain, take our cut."),
    ("Deliver", "Upstream response streams back to the agent."),
]
n = len(steps)
gap = 0.3
w = (CW - gap * (n - 1)) / n
y, h = 3.0, 2.5
for i, (t, b) in enumerate(steps):
    x = ML + i * (w + gap)
    rect(s, x, y, w, h, fill=PANEL, line=PANEL2, rounded=True, radius=0.07)
    text(s, x, y + 0.32, w, 0.5, f"{i+1}", size=26, color=ACCENT2, bold=True, align=PP_ALIGN.CENTER)
    text(s, x + 0.18, y + 0.92, w - 0.36, 0.5, t, size=16.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    text(s, x + 0.2, y + 1.42, w - 0.4, h - 1.5, b, size=12, color=MUTED, align=PP_ALIGN.CENTER, spacing=1.14)
    if i < n - 1:
        text(s, x + w - 0.02, y, gap, h, "›", size=26, color=FAINT, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
text(s, ML, 5.95, CW, 0.6,
     "The agent developer writes none of this — the payment-aware client handles the whole handshake.",
     size=14, color=MUTED, italic=True)
footer(s, 6)

# ════════════════════════════════════════════════════════════════════════════
# 7 — THE MOAT: identity + reputation
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "The differentiator")
heading(s, "Payments that are identity- and reputation-aware")
text(s, ML, 2.15, CW, 0.9,
     [[("We don’t just move money — we’re the ", {"color": WHITE, "size": 17}),
       ("trust layer for agent commerce.", {"color": ACCENT2, "size": 17, "bold": True})]],
     spacing=1.2)
cards(s, [
    ("On-chain identity",
     "Every agent has a verifiable on-chain identity (ERC-8004). Sellers can require it: “only known agents may call this endpoint.”"),
    ("Reputation that compounds",
     "Every successful payment builds the agent’s track record. Sellers can gate premium endpoints on it: “only agents that reliably pay.”"),
    ("Proprietary, accretive data",
     "We sit on the ledger of which agents actually pay. That dataset gets more valuable — and harder to copy — every single day."),
], y=3.05, h=3.0)
footer(s, 7)

# ════════════════════════════════════════════════════════════════════════════
# 8 — BUSINESS MODEL
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "Business model")
heading(s, "A take rate on every transaction")
text(s, ML, 2.2, 7.4, 2.6,
     [[("We skim a percentage of every call that flows through a gate.", {"color": WHITE, "size": 19})],
      [("No transaction, no fee. Every transaction, our fee.", {"color": MUTED, "size": 15})]],
     spacing=1.25, space_after=10)
text(s, ML, 3.5, 6.5, 1.4,
     [[("Zero marginal cost per call. ", {"color": WHITE, "size": 15, "bold": True}),
       ("Revenue compounds directly with the growth of the agent economy.", {"color": MUTED, "size": 15})]],
     spacing=1.25)
text(s, ML, 4.7, 6.6, 2,
     [[("Later: ", {"color": ACCENT2, "size": 14, "bold": True}),
       ("premium reputation & fraud-scoring data, enterprise SLAs, fiat on/off-ramps.", {"color": MUTED, "size": 14})]],
     spacing=1.2)
# right: the split visual
px, pw = 8.7, CW - (8.7 - ML)
rect(s, px, 2.2, pw, 3.7, fill=PANEL, line=PANEL2, rounded=True, radius=0.05)
text(s, px, 2.55, pw, 1.2, [["10%"]], size=64, color=ACCENT2, bold=True, align=PP_ALIGN.CENTER)
text(s, px, 3.75, pw, 0.4, "platform take rate (tunable)", size=13, color=MUTED, align=PP_ALIGN.CENTER)
rect(s, px + 0.4, 4.35, pw - 0.8, 0.02, fill=PANEL2)
text(s, px + 0.4, 4.55, pw - 0.8, 1.2,
     [[("Agent pays  ", {"color": MUTED, "size": 14}), ("$0.0100", {"color": WHITE, "size": 14, "bold": True})],
      [("Seller gets  ", {"color": MUTED, "size": 14}), ("$0.0090", {"color": GREEN, "size": 14, "bold": True})],
      [("GateKeep  ", {"color": MUTED, "size": 14}), ("$0.0010", {"color": ACCENT2, "size": 14, "bold": True})]],
     align=PP_ALIGN.CENTER, spacing=1.3)
footer(s, 8)

# ════════════════════════════════════════════════════════════════════════════
# 9 — MARKET / WHY BIG
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "The opportunity")
heading(s, "Every agent call is a transaction we can earn on")
cards(s, [
    ("A new buyer class",
     "Millions of agents are coming online, each making thousands of paid calls. That’s a transaction volume that didn’t exist two years ago — and it only points up."),
    ("Picks & shovels",
     "We don’t bet on any one agent or API winning. We monetize the traffic between all of them — the rail everyone has to cross."),
    ("Standards-native",
     "Built on open protocols (x402, ERC-8004). We ride the ecosystem instead of fighting it — and we’re the easiest on-ramp to it."),
], y=2.75, h=3.5)
footer(s, 9)

# ════════════════════════════════════════════════════════════════════════════
# 10 — MOAT / DEFENSIBILITY
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "Why we win")
heading(s, "The flywheel compounds")
# flywheel as 3 chips + arrows, then reputation note
chips = ["More gated APIs", "More paying agents", "Richer reputation data"]
n = len(chips)
gap = 0.55
w = (CW - gap * (n - 1)) / n
y, h = 2.9, 1.5
for i, c in enumerate(chips):
    x = ML + i * (w + gap)
    rect(s, x, y, w, h, fill=PANEL, line=ACCENT, line_w=1.2, rounded=True, radius=0.12)
    text(s, x + 0.2, y, w - 0.4, h, c, size=18, color=WHITE, bold=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    if i < n - 1:
        text(s, x + w, y, gap, h, "→", size=26, color=ACCENT2, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
text(s, ML, 4.7, CW, 1.6,
     [[("Two-sided network effects", {"color": ACCENT2, "size": 16, "bold": True}),
       (" — each side pulls in the other. And the reputation ledger is ", {"color": MUTED, "size": 16}),
       ("proprietary and accretive", {"color": WHITE, "size": 16, "bold": True}),
       (": it’s the thing sellers need to safely open up to bots, and it gets more valuable the longer we run.", {"color": MUTED, "size": 16})]],
     spacing=1.3)
footer(s, 10)

# ════════════════════════════════════════════════════════════════════════════
# 11 — TRACTION
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "Status")
heading(s, "Working product — live on Avalanche")
items = [
    ("Real on-chain settlement", "USDC moves per call on Avalanche Fuji — every payment verifiable on Snowtrace."),
    ("Gasless agent payments", "Agents sign; they never hold gas. The full x402 handshake works end-to-end."),
    ("One-click gates + dashboard", "Create a paywall, watch the live call feed, withdraw earnings to your wallet."),
    ("Identity + reputation live", "ERC-8004 enforced: unregistered agents blocked, reputation accrues and unlocks gated endpoints — demonstrated live."),
]
n = len(items)
gap = 0.35
w = (CW - gap) / 2
y0, h = 2.75, 1.55
for i, (t, b) in enumerate(items):
    r, c = divmod(i, 2)
    x = ML + c * (w + gap)
    yy = y0 + r * (h + 0.3)
    rect(s, x, yy, w, h, fill=PANEL, line=PANEL2, rounded=True, radius=0.06)
    text(s, x + 0.3, yy + 0.24, 0.5, 0.5, "✓", size=18, color=GREEN, bold=True)
    text(s, x + 0.75, yy + 0.22, w - 1.0, 0.5, t, size=16.5, color=WHITE, bold=True)
    text(s, x + 0.75, yy + 0.68, w - 1.0, h - 0.7, b, size=12.5, color=MUTED, spacing=1.15)
text(s, ML, 6.55, CW, 0.4,
     "Built for the Avalanche “Agentic Payments” track — hitting the bonus: payments that are also identity- and reputation-aware.",
     size=12.5, color=FAINT, italic=True)
footer(s, 11)

# ════════════════════════════════════════════════════════════════════════════
# 12 — THE ASK
# ════════════════════════════════════════════════════════════════════════════
s = slide()
kicker(s, "The ask")
heading(s, "Raising to take the rail to mainnet")
cards(s, [
    ("Ship to mainnet",
     "Production-grade settlement, security hardening, and reliability so real money flows safely."),
    ("Land the first 100 APIs",
     "Integrate with the leading agent frameworks so GateKeep is the default payment line in every agent’s toolkit."),
    ("Build the trust product",
     "Turn the reputation ledger into the durable moat — scoring, fraud signals, the data sellers pay for."),
], y=2.75, h=2.6)
rect(s, ML, 5.65, CW, 0.9, fill=PANEL, line=ACCENT, line_w=1.2, rounded=True, radius=0.1)
text(s, ML, 5.65, CW, 0.9,
     [[("The bet:  ", {"color": ACCENT2, "size": 16, "bold": True}),
       ("when agents do most of the buying online, every paid call needs a rail that speaks their language. We’re building it — and we earn a slice of each one.", {"color": WHITE, "size": 16})]],
     anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER, spacing=1.15)
footer(s, 12)

# ════════════════════════════════════════════════════════════════════════════
# 13 — CLOSE
# ════════════════════════════════════════════════════════════════════════════
s = slide()
rect(s, 0, 0, 0.22, SH, fill=ACCENT)
logo(s, ML, 1.7, 0.95)
text(s, ML + 1.25, 1.7, 8, 0.95, "GateKeep", size=44, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
text(s, ML, 3.1, CW, 1.6,
     [[("When agents do the buying,", {"color": WHITE, "size": 32, "bold": True})],
      [("every call needs a rail that speaks their language.", {"color": ACCENT2, "size": 32, "bold": True})]],
     spacing=1.12)
rect(s, ML, 5.1, 0.55, 0.05, fill=ACCENT)
text(s, ML, 5.35, CW, 0.5, "Stripe for the agent economy.", size=18, color=ACCENTL)
text(s, ML, 6.1, CW, 0.5,
     [[("Live demo + code:  ", {"color": MUTED, "size": 14}),
       ("github.com/anukulpandey/x402-payment-gate", {"color": WHITE, "size": 14, "bold": True})]])

# ── save ───────────────────────────────────────────────────────────────────
out = os.path.join(os.path.dirname(__file__), "..", "docs", "GateKeep-Investor-Deck.pptx")
out = os.path.abspath(out)
prs.save(out)
print("wrote", out, "—", len(prs.slides._sldIdLst), "slides")

import React, { useMemo, useState, useEffect, forwardRef } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Plus, Sparkles, Vote as VoteIcon, BarChart2, Users, Lock, Rocket, Flame, Check, PenSquare, Search, Tag, Trash2, LogIn, Mail, Image as ImageIcon, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * VoteApp — single-file app (landing + polls + auth stubs + profile + ToS)
 * - Polls with images, vote-locked results (pie chart after voting)
 * - Auth stubs: Google + Email/Password (ready for integration)
 * - Profile page: username + avatar upload
 * - Terms of Service & Privacy dialogs
 * - Local UIButton fallback (fixes environments without shadcn Button)
 */

// ---- Branding -------------------------------------------------
const brand = {
  name: "VoteApp",
  primary: "from-indigo-500 via-violet-500 to-fuchsia-500",
};

// ---- Local Button fallback (no external Button import) --------
const UIButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost"; size?: "sm" | "lg" | "icon"; }>(
  ({ className = "", variant = "default", size, children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
    const variants: Record<string, string> = {
      default: "bg-slate-700 hover:bg-slate-600 text-white",
      outline: "border border-slate-600 hover:border-slate-400 bg-transparent text-slate-100",
      ghost: "bg-transparent hover:bg-slate-800/50 text-slate-100",
    };
    const sizes: Record<string, string> = { sm: "px-3 py-1.5 text-sm", lg: "px-4 py-2.5 text-base", icon: "p-2" };
    const sizeCls = size ? sizes[size] : "px-3 py-2";
    return (
      <button ref={ref} className={`${base} ${variants[variant] ?? variants.default} ${sizeCls} ${className}`} {...props}>{children}</button>
    );
  }
);
UIButton.displayName = "UIButton";
const MotionButton: any = motion(UIButton as any);

// ---- Types ----------------------------------------------------
interface Option { id: string; text: string; votes: number; }
interface Poll { id: string; question: string; description?: string; options: Option[]; category: string; createdAt: number; imageUrl?: string | null; }

// ---- Local storage helpers -----------------------------------
const LS_POLLS_KEY = "voteapp_polls_v1";
const LS_VOTES_KEY = "voteapp_votes_v1";
function loadPolls(): Poll[] { const raw = localStorage.getItem(LS_POLLS_KEY); if (!raw) return []; try { return JSON.parse(raw) as Poll[]; } catch { return []; } }
function savePolls(polls: Poll[]) { localStorage.setItem(LS_POLLS_KEY, JSON.stringify(polls)); }
function loadVotes(): Record<string, string> { const raw = localStorage.getItem(LS_VOTES_KEY); if (!raw) return {}; try { return JSON.parse(raw) as Record<string, string>; } catch { return {}; } }
function saveVotes(v: Record<string, string>) { localStorage.setItem(LS_VOTES_KEY, JSON.stringify(v)); }

// ---- Utilities ------------------------------------------------
const uid = () => Math.random().toString(36).slice(2, 10);
const timeAgo = (ts: number) => { const s = Math.floor((Date.now() - ts) / 1000); if (s < 60) return `${s}s ago`; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const d = Math.floor(h / 24); return `${d}d ago`; };

// ---- API stubs (server-ready) --------------------------------
const SERVER_API_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || "";
const USE_SERVER = !!SERVER_API_URL;
const api = {
  async createPoll(poll: Omit<Poll, "id" | "createdAt">): Promise<{ id: string } | null> { if (!USE_SERVER) return null; try { const res = await fetch(`${SERVER_API_URL}/polls`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(poll) }); if (!res.ok) throw new Error("Create failed"); return res.json(); } catch (e) { console.warn("API:createPoll", e); return null; } },
  async vote(pollId: string, optionId: string): Promise<boolean> { if (!USE_SERVER) return true; try { const res = await fetch(`${SERVER_API_URL}/polls/${pollId}/votes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optionId }) }); return res.ok; } catch (e) { console.warn("API:vote", e); return false; } },
};

// ---- Seed polls ----------------------------------------------
const seedPolls: Poll[] = [
  { id: uid(), question: "Who will win the national election?", description: "Community prediction for the upcoming general election.", options: [ { id: uid(), text: "Party A", votes: 42 }, { id: uid(), text: "Party B", votes: 58 }, { id: uid(), text: "Undecided", votes: 11 } ], category: "Politics", createdAt: Date.now() - 1000 * 60 * 60 * 6, imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368b5?w=1200&q=80&auto=format&fit=crop" },
  { id: uid(), question: "Best smartphone of 2025?", description: "Vote for the device that impressed you most this year.", options: [ { id: uid(), text: "Pixel", votes: 23 }, { id: uid(), text: "iPhone", votes: 31 }, { id: uid(), text: "Galaxy", votes: 19 } ], category: "Tech", createdAt: Date.now() - 1000 * 60 * 60 * 30, imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80&auto=format&fit=crop" },
  { id: uid(), question: "Which club wins the league?", description: "Prediction market style fan poll.", options: [ { id: uid(), text: "Club X", votes: 12 }, { id: uid(), text: "Club Y", votes: 28 }, { id: uid(), text: "Club Z", votes: 21 } ], category: "Sports", createdAt: Date.now() - 1000 * 60 * 60 * 90, imageUrl: "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1200&q=80&auto=format&fit=crop" },
];
function ensureSeed() { const existing = loadPolls(); if (existing.length) return existing; savePolls(seedPolls); return seedPolls; }

// ---- Cookie banner -------------------------------------------
function CookieBanner() { const [show, setShow] = useState(false); useEffect(() => { const ok = localStorage.getItem("va_cookie_ok"); if (!ok) setShow(true); }, []); if (!show) return null; return (
  <div className="fixed bottom-3 left-3 right-3 md:left-auto md:right-6 z-50">
    <div className="rounded-2xl border border-slate-700 bg-slate-900/90 backdrop-blur p-4 shadow-xl max-w-xl">
      <div className="text-slate-100 font-medium">We use cookies & ads</div>
      <div className="mt-1 text-slate-300 text-sm">To keep VoteApp free, we run ads and store cookies for analytics, preferences, and essential features. See our Privacy Policy and Terms for details.</div>
      <div className="mt-3 flex gap-2 justify-end">
        <MotionButton whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} variant="outline" onClick={() => { localStorage.setItem("va_cookie_ok", "dismissed"); setShow(false); }}>Dismiss</MotionButton>
        <MotionButton whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600" onClick={() => { localStorage.setItem("va_cookie_ok", "true"); setShow(false); }}>Accept</MotionButton>
      </div>
    </div>
  </div>
); }

// ---- Privacy dialog ------------------------------------------
function PrivacyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader><DialogTitle>Privacy Policy</DialogTitle></DialogHeader>
        <div className="space-y-4 text-slate-200">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>VoteApp is operated by <strong>KLP Studios (Key Lock Principle Studios)</strong>. We collect minimal data to provide the service and keep it free through advertising.</p>
          <h4 className="text-lg font-semibold text-white">Data we collect</h4>
          <ul className="list-disc pl-5 space-y-1"><li>Account data (if you sign in): email, display name, avatar</li><li>Usage data: device info, approximate location, pages and interactions</li><li>Poll data: questions, options, vote counts</li><li>Cookies: essential, analytics, and advertising</li></ul>
          <h4 className="text-lg font-semibold text-white">Your choices</h4>
          <ul className="list-disc pl-5 space-y-1"><li>Cookie preferences via the banner</li><li>Data export/delete: support@voteapp.example</li><li>Private polls & visibility controls (when enabled)</li></ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Terms of Service ----------------------------------------
function TermsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] overflow-y-auto max-h-[80vh]">
        <DialogHeader><DialogTitle>Terms of Service</DialogTitle></DialogHeader>
        <div className="space-y-4 text-slate-200">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>Welcome to VoteApp, owned and operated by <strong>KLP Studios (Key Lock Principle Studios)</strong>. By using our services, you agree to these terms.</p>
          <h4 className="text-lg font-semibold text-white">1. Use of Service</h4>
          <p>VoteApp allows users to create and participate in polls. You agree to use the service lawfully and responsibly.</p>
          <h4 className="text-lg font-semibold text-white">2. Accounts & Authentication</h4>
          <p>You may sign in via Google or email + password. You are responsible for account security and all activity under your account.</p>
          <h4 className="text-lg font-semibold text-white">3. Profiles</h4>
          <p>You can set a username and profile picture. Do not impersonate others or upload offensive content. We may remove content that violates these terms.</p>
          <h4 className="text-lg font-semibold text-white">4. Poll Content & Images</h4>
          <p>When creating polls, you may upload or link images. You must own the rights to the content you upload or ensure it is licensed for your use.</p>
          <h4 className="text-lg font-semibold text-white">5. Monetization</h4>
          <p>We may show advertisements to fund the service. Cookies or similar technologies may be used for measurement.</p>
          <h4 className="text-lg font-semibold text-white">6. Liability</h4>
          <p>The service is provided "as is" without warranties. To the extent permitted by law, KLP Studios is not liable for indirect or consequential damages.</p>
          <h4 className="text-lg font-semibold text-white">7. Termination</h4>
          <p>We may suspend or terminate access for violations, abuse, or illegal activity.</p>
          <h4 className="text-lg font-semibold text-white">8. Changes</h4>
          <p>We may update these terms from time to time. Continued use constitutes acceptance of the updated terms.</p>
          <p>Contact: support@voteapp.example</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Auth stubs (UI only) ------------------------------------
function AuthButtons({ onLogin }: { onLogin?: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <MotionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600" onClick={onLogin}><LogIn className="h-4 w-4 mr-2"/> Sign in with Google</MotionButton>
      <MotionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} variant="outline"><Mail className="h-4 w-4 mr-2"/> Email & Password</MotionButton>
    </div>
  );
}

// ---- Main app -------------------------------------------------
export default function VoteApp() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [route, setRoute] = useState<'home' | 'profile'>('home');

  useEffect(() => { setPolls(ensureSeed()); setVotes(loadVotes()); }, []);
  useEffect(() => { savePolls(polls); }, [polls]);
  useEffect(() => { saveVotes(votes); }, [votes]);

  const categories = useMemo(() => { const set = new Set<string>(["All"]); polls.forEach(p => set.add(p.category)); return Array.from(set); }, [polls]);
  const filtered = useMemo(() => polls.filter(p => categoryFilter === "All" || p.category === categoryFilter).filter(p => p.question.toLowerCase().includes(query.toLowerCase())), [polls, categoryFilter, query]);

  async function createPoll(input: Partial<Poll>) {
    if (!input.question || !input.options || input.options.length < 2) return;
    const cleanOptions = input.options.map(o => ({ id: uid(), text: (o as any).text, votes: 0 })).filter(o => o.text.trim().length > 0);
    const newPoll: Poll = { id: uid(), question: input.question.trim(), description: input.description?.trim(), options: cleanOptions, category: input.category || "General", createdAt: Date.now(), imageUrl: input.imageUrl || null };
    setPolls([newPoll, ...polls]);
    api.createPoll({ question: newPoll.question, description: newPoll.description, options: newPoll.options, category: newPoll.category, imageUrl: newPoll.imageUrl } as any).then(() => {});
  }

  async function vote(pollId: string, optionId: string) {
    if (votes[pollId]) return;
    setPolls(prev => prev.map(p => p.id !== pollId ? p : ({ ...p, options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o) })));
    setVotes(prev => ({ ...prev, [pollId]: optionId }));
    api.vote(pollId, optionId);
  }

  function deletePoll(pollId: string) { setPolls(prev => prev.filter(p => p.id !== pollId)); const v = { ...votes }; delete v[pollId]; setVotes(v); }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      {/* animated hue shift */}
      <motion.div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${brand.primary} opacity-10`} animate={{ filter: ["hue-rotate(0deg)", "hue-rotate(18deg)", "hue-rotate(0deg)"] }} transition={{ duration: 20, ease: "linear", repeat: Infinity }} />

      <header className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-r ${brand.primary} opacity-20 blur-3xl`} />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 grid place-items-center shadow-lg shadow-indigo-900/30"><Check className="h-5 w-5 text-white" /></div>
              <span className="text-xl font-semibold tracking-tight text-white">VoteApp</span>
              <Badge className="ml-2 bg-slate-800/70">beta</Badge>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <MotionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} variant="ghost" className={route==='home'?"text-slate-200":"text-slate-400"} onClick={()=>setRoute('home')}>Home</MotionButton>
              <MotionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} variant="ghost" className={route==='profile'?"text-slate-200":"text-slate-400"} onClick={()=>setRoute('profile')}><UserCircle2 className="mr-2 h-4 w-4"/>Profile</MotionButton>
              <MotionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} variant="ghost" className="text-slate-200" onClick={()=>setTermsOpen(true)}>Terms</MotionButton>
              <MotionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600"><LogIn className="mr-2 h-4 w-4"/>Sign in</MotionButton>
            </div>
          </nav>

          {route==='home' && (
            <div className="grid md:grid-cols-2 gap-8 items-center py-14">
              <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="text-4xl md:text-5xl font-bold tracking-tight text-white">Predict, decide, and <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">vote together</span></motion.h1>
                <p className="mt-4 text-slate-200 leading-relaxed">Build fast, beautiful polls with images. Share links, collect votes, and reveal results instantly after you vote.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <AuthButtons />
                </div>
              </motion.div>
              <motion.div className="relative" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                <div className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-indigo-600/20 to-fuchsia-600/20 blur-2xl" />
                <Card className="bg-slate-900/60 border-slate-700 backdrop-blur">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-white"><VoteIcon className="h-5 w-5 text-indigo-400"/>Live demo</CardTitle></CardHeader>
                  <CardContent><DemoChart /></CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24">
        {route==='home' ? (
          <>
            <SectionIntro onSearch={setQuery} />
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-2 overflow-x-auto">
                <Tabs value={categoryFilter} onValueChange={setCategoryFilter as any}>
                  <TabsList className="bg-slate-800/60">
                    {categories.map(c => (<TabsTrigger key={c} value={c} className="data-[state=active]:bg-slate-700/80">{c}</TabsTrigger>))}
                  </TabsList>
                </Tabs>
              </div>
              <MotionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600" onClick={() => (document.getElementById('create-poll-trigger') as HTMLButtonElement)?.click()}><Plus className="mr-2 h-4 w-4"/>New poll</MotionButton>
              <CreatePollDialog onCreate={createPoll} />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {filtered.map((poll, idx) => (
                <motion.div key={poll.id} initial={{ opacity: 0, x: idx % 2 ? 30 : -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
                  <PollCard poll={poll} onVote={vote} votedFor={votes[poll.id]} onDelete={() => deletePoll(poll.id)} />
                </motion.div>
              ))}
              {filtered.length === 0 && (
                <Card className="bg-slate-800/70 border-slate-700">
                  <CardHeader><CardTitle className="text-white">No polls found</CardTitle></CardHeader>
                  <CardContent className="text-slate-200">Try a different search or category.</CardContent>
                </Card>
              )}
            </div>

            <TrustStrip />
          </>
        ) : (
          <ProfilePage />
        )}
      </main>

      <SiteFooter onOpenPrivacy={()=>setPrivacyOpen(true)} onOpenTerms={()=>setTermsOpen(true)} />
      <CookieBanner />
      <PrivacyDialog open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} />
    </div>
  );
}

// ---- Section intro -------------------------------------------
function SectionIntro({ onSearch }: { onSearch: (q: string) => void }) { return (
  <div className="mt-10">
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/70 px-3 py-1 text-sm text-slate-100"><Flame className="h-4 w-4 text-amber-400" /> Trending today</div>
    <h2 className="mt-3 text-2xl font-semibold text-white">Community polls</h2>
    <p className="text-slate-200 mt-1">Browse fresh takes across politics, sports, entertainment, and tech.</p>
    <div className="mt-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
        <input placeholder="Search polls (e.g., election, football, tech)" className="w-full rounded-2xl bg-slate-800/80 border border-slate-700 py-3 pl-11 pr-4 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" onChange={(e)=>onSearch(e.target.value)} />
      </div>
    </div>
  </div>
); }

// ---- Create Poll ---------------------------------------------
function CreatePollDialog({ onCreate }: { onCreate: (p: Partial<Poll>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <MotionButton id="create-poll-trigger" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600"><Plus className="mr-2 h-4 w-4"/> New poll</MotionButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader><DialogTitle>Create a poll</DialogTitle></DialogHeader>
        <PollForm onSubmit={(p) => { onCreate(p); setOpen(false); }} />
      </DialogContent>
    </Dialog>
  );
}

function PollForm({ onSubmit }: { onSubmit: (p: Partial<Poll>) => void }) {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Politics");
  const [options, setOptions] = useState<string[]>(["Option A", "Option B"]);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");

  function addOption() { setOptions(o => [...o, ""]); }
  function removeOption(i: number) { setOptions(o => o.filter((_, idx) => idx !== i)); }
  function updateOption(i: number, text: string) { setOptions(o => o.map((v, idx) => idx === i ? text : v)); }
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { setImageUrl(r.result as string); setImagePreview(r.result as string); }; r.readAsDataURL(f); }

  function submit() {
    const cleaned = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) return;
    onSubmit({ question, description, category, imageUrl: imageUrl || imagePreview, options: cleaned.map(text => ({ id: "", text, votes: 0 })) as any });
    setQuestion(""); setDescription(""); setOptions(["Option A", "Option B"]); setImageUrl(""); setImagePreview("");
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label className="text-slate-100">Question</Label>
        <Input placeholder="e.g., Who will win the election?" value={question} onChange={e => setQuestion(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label className="text-slate-100">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
        <Textarea placeholder="Add helpful context so people can vote confidently." rows={4} value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="text-slate-100">Category</Label>
          <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-slate-300" /><Input placeholder="Politics, Sports, Tech..." value={category} onChange={e => setCategory(e.target.value)} /></div>
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-100">Image (URL or upload)</Label>
          <div className="flex items-center gap-2">
            <Input placeholder="https://..." value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImagePreview(e.target.value); }} />
            <label className="inline-flex items-center gap-2 text-slate-200 cursor-pointer"><ImageIcon className="h-4 w-4"/> <input type="file" accept="image/*" className="hidden" onChange={handleFile} />Upload</label>
          </div>
          {(imagePreview) && <img src={imagePreview} alt="preview" className="mt-2 h-32 w-full object-cover rounded-lg border border-slate-700" />}
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="text-slate-100">Options</Label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i+1}`} />
              {options.length > 2 && (<MotionButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} variant="outline" size="icon" onClick={() => removeOption(i)}><Trash2 className="h-4 w-4"/></MotionButton>)}
            </div>
          ))}
        </div>
        <MotionButton whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} variant="ghost" onClick={addOption}><Plus className="h-4 w-4 mr-2"/>Add option</MotionButton>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <MotionButton whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} variant="outline">Cancel</MotionButton>
        <MotionButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600" onClick={submit}><PenSquare className="h-4 w-4 mr-2"/>Create poll</MotionButton>
      </div>
    </div>
  );
}

// ---- Poll Card ------------------------------------------------
function PollCard({ poll, onVote, votedFor, onDelete }: { poll: Poll; onVote: (pollId: string, optionId: string) => void; votedFor?: string; onDelete: () => void; }) {
  const totalVotes = poll.options.reduce((a, b) => a + b.votes, 0);
  const pct = (v: number) => totalVotes ? Math.round((v / totalVotes) * 100) : 0;

  return (
    <Card className="bg-slate-900/70 border-slate-700 backdrop-blur relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ background: "radial-gradient(1200px 300px at -10% -20%, #6366f128 0%, transparent 60%), radial-gradient(1200px 300px at 110% 120%, #d946ef28 0%, transparent 60%)" }} />
      <CardHeader className="flex flex-row items-center justify-between relative">
        <div>
          <CardTitle className="text-2xl md:text-3xl font-semibold leading-tight text-white">{poll.question}</CardTitle>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-200"><Badge variant="outline" className="border-slate-600 text-slate-100">{poll.category}</Badge><span>—</span><span>{timeAgo(poll.createdAt)}</span></div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <MotionButton whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} variant="ghost" size="icon" aria-label="Poll menu">⋯</MotionButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-red-400">Delete</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="grid md:grid-cols-2 gap-4 relative">
        {/* Left: image + options */}
        <div>
          {poll.imageUrl && <img src={poll.imageUrl} alt="Poll" className="w-full h-48 object-cover rounded-lg mb-3 border border-slate-700" />}
          <p className="text-slate-200 text-sm min-h-10">{poll.description}</p>

          {!votedFor && (
            <>
              <div className="mt-3 space-y-2">
                {poll.options.map(opt => (
                  <motion.button key={opt.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => onVote(poll.id, opt.id)} className="group w-full text-left rounded-xl border border-slate-600 px-3 py-2 hover:border-slate-400 transition bg-slate-800/60">
                    <div className="flex items-center justify-between"><span className="font-medium text-slate-100">{opt.text}</span><span className="text-slate-300 text-xs tracking-wide uppercase">Vote</span></div>
                  </motion.button>
                ))}
              </div>
              <div className="mt-3 text-sm text-slate-300">Results unlock after you vote.</div>
            </>
          )}

          {votedFor && (
            <div className="mt-3 text-sm text-slate-200 flex items-center justify-between"><span>{totalVotes.toLocaleString()} total votes</span><span>You voted</span></div>
          )}
        </div>

        {/* Right: results */}
        <div className="h-56">
          {!votedFor ? (
            <div className="h-full w-full grid place-items-center text-slate-300 text-sm border border-dashed border-slate-600 rounded-xl">Vote to reveal results</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={poll.options} dataKey="votes" nameKey="text" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {poll.options.map((o, i) => (<Cell key={o.id} fill={i % 2 ? "#d946ef" : "#4f46e5"} />))}
                </Pie>
                <Tooltip formatter={(value: any, name: any) => [`${pct(Number(value))}%`, name]} contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }} />
                <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Demo chart in hero --------------------------------------
function DemoChart() { const data = [ { name: "Party A", votes: 42 }, { name: "Party B", votes: 58 }, { name: "Undecided", votes: 11 } ]; return (
  <div className="h-56">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="name" tick={{ fill: "#cbd5e1" }} />
        <YAxis tick={{ fill: "#cbd5e1" }} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }} />
        <Bar dataKey="votes" radius={[6, 6, 0, 0]} fill="url(#gradHero)" />
        <defs><linearGradient id="gradHero" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#d946ef" /></linearGradient></defs>
      </BarChart>
    </ResponsiveContainer>
  </div>
); }

// ---- Trust strip ---------------------------------------------
function TrustStrip() {
  const items = [
    { title: "Verified Profiles", blurb: "Sign in with Google or email and personalize your presence." },
    { title: "Image Polls", blurb: "Add images to polls for richer context before results are revealed." },
    { title: "Community Focus", blurb: "Engage with trending topics across interests." },
  ];
  return (
    <div className="mt-10 grid md:grid-cols-3 gap-4">
      {items.map((it, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}>
          <Card className="bg-slate-900/60 border-slate-700"><CardHeader><CardTitle className="text-white">{it.title}</CardTitle></CardHeader><CardContent className="text-slate-200 text-sm">{it.blurb}</CardContent></Card>
        </motion.div>
      ))}
    </div>
  );
}

// ---- Profile Page --------------------------------------------
function ProfilePage() {
  const [username, setUsername] = useState("Guest");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => setPhoto(reader.result as string); reader.readAsDataURL(file); } }
  return (
    <main className="max-w-3xl mx-auto mt-12 px-4">
      <Card className="bg-slate-900/70 border-slate-700">
        <CardHeader><CardTitle className="text-white text-2xl">Your Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-slate-200">
          <div><Label className="text-slate-100">Profile Picture</Label><div className="flex items-center gap-4 mt-2">{photo ? <img src={photo} alt="profile" className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-slate-700 grid place-items-center">N/A</div>}<Input type="file" accept="image/*" onChange={handlePhoto} /></div></div>
          <div><Label className="text-slate-100">Username</Label><Input value={username} onChange={e => setUsername(e.target.value)} className="mt-2" /></div>
          <div><Label className="text-slate-100">Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} className="mt-2" /></div>
          <MotionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 mt-4">Save Changes</MotionButton>
        </CardContent>
      </Card>
    </main>
  );
}

// ---- Footer ---------------------------------------------------
function SiteFooter({ onOpenPrivacy, onOpenTerms }: { onOpenPrivacy: () => void; onOpenTerms: () => void }) {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 grid place-items-center shadow-lg shadow-indigo-900/30"><Check className="h-5 w-5 text-white" /></div><span className="text-xl font-semibold tracking-tight text-white">VoteApp</span></div>
          <div className="text-slate-200 text-sm">© {new Date().getFullYear()} VoteApp. All rights reserved. — Published by <span className="font-semibold">KLP Studios</span> (<span className="italic">Key Lock Principle Studios</span>).</div>
          <div className="flex items-center gap-3 text-slate-100">
            <button className="hover:text-white" onClick={onOpenTerms}>Terms</button>
            <button className="hover:text-white" onClick={onOpenPrivacy}>Privacy</button>
            <button className="hover:text-white" onClick={() => {}}>Contact</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---- Tiny runtime tests (sanity) ------------------------------
(function runDevTests(){ try { console.assert(typeof UIButton === 'function', 'UIButton should exist'); console.assert(uid() !== uid(), 'uid should vary'); const now=Date.now(); const s=timeAgo(now-5000); console.assert(/ago$/.test(s), 'timeAgo format'); } catch(e) { /* no-op */ }})();

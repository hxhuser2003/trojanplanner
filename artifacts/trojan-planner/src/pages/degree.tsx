import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { Upload, ScanText, AlertTriangle, X, Plus, ShieldAlert, FileSearch } from 'lucide-react';
import { useParseStars, type Catalog, type PlannerInput, type StarsResult } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CatalogGate } from '@/components/gate';
import { PageHeader } from '@/components/shell';
import { usePlanner } from '@/lib/planner-store';
import { errMessage } from '@/lib/format';
import { extractPdfText, ocrPdf } from '@/lib/pdf-extract';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function DegreePage() {
  return <CatalogGate>{(c) => <Degree catalog={c} />}</CatalogGate>;
}

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, '').replace(/^([A-Z]+)(\d)/, '$1-$2');

function Degree({ catalog }: { catalog: Catalog }) {
  const p = usePlanner();
  const { toast } = useToast();
  const input = p.input ?? catalog.defaultInput;
  const set = (patch: Partial<PlannerInput>) => p.setInput({ ...input, ...patch });
  const completed = new Set(input.completedCourses);
  const known = new Set([...catalog.completedOptions, ...catalog.courses.map((c) => c.id), ...catalog.courses.map((c) => c.code)]);
  const outside = input.completedCourses.filter((c) => !known.has(c));
  const [manual, setManual] = useState('');

  const toggleCompleted = (id: string) => set({ completedCourses: completed.has(id) ? input.completedCourses.filter((x) => x !== id) : [...input.completedCourses, id].slice(0, 100) });
  const addManual = () => {
    const codes = manual.split(/[,\n]/).map((s) => norm(s.trim())).filter((s) => /^[A-Z]{2,5}-\d{2,4}[A-Z]?$/.test(s));
    if (!codes.length) { toast({ title: 'Use a code like CSCI-570 or CSCI 585', variant: 'destructive' }); return; }
    set({ completedCourses: Array.from(new Set([...input.completedCourses, ...codes])).slice(0, 100) });
    setManual('');
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-6">
      <PageHeader eyebrow={`${catalog.major} · ${catalog.catalogYear}`} title="What you've done, what you need.">
        <Button onClick={() => p.solve()} disabled={p.solveState === 'solving' || !p.dirty} data-testid="button-degree-solve">{p.dirty ? 'Re-solve with these' : 'Plan is up to date'}</Button>
      </PageHeader>

      <div className="rounded-xl border-l-4 border-primary bg-card p-4 mb-6 flex gap-3" data-testid="text-audit-disclaimer">
        <ShieldAlert className="size-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm">Course offerings are from a cached USC listing. The <strong>student profile and planning goals are illustrative</strong>. This does not reproduce, replace, or certify your USC degree audit (STARS). Confirm requirements with your advisor and the official report.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold">Units this semester</h2>
            <p className="text-xs text-muted-foreground mb-3">The solver keeps your plan inside this range.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="minu">Min units</Label><Input id="minu" type="number" min={0} max={20} value={input.minUnits} onChange={(e) => set({ minUnits: Math.min(20, Math.max(0, Number(e.target.value))) })} data-testid="input-min-units" /></div>
              <div className="space-y-1"><Label htmlFor="maxu">Max units</Label><Input id="maxu" type="number" min={0} max={20} value={input.maxUnits} onChange={(e) => set({ maxUnits: Math.min(20, Math.max(0, Number(e.target.value))) })} data-testid="input-max-units" /></div>
            </div>
            {input.minUnits > input.maxUnits && <p className="text-xs text-destructive mt-2">Min units is above max units; the solver will report this as invalid.</p>}
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold">Completed courses</h2>
            <p className="text-xs text-muted-foreground mb-3">Used for prerequisites. Only check courses with a final grade.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {catalog.completedOptions.map((id) => (
                <label key={id} className={cn('flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm font-mono cursor-pointer transition-colors', completed.has(id) ? 'bg-primary/5 border-primary' : 'hover:bg-secondary/50')}>
                  <Checkbox checked={completed.has(id)} onCheckedChange={() => toggleCompleted(id)} data-testid={`checkbox-completed-${id}`} />{id}
                </label>
              ))}
            </div>
            <div className="mt-4">
              <Label htmlFor="manual">Add a course code not listed</Label>
              <div className="flex gap-2 mt-1">
                <Input id="manual" value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManual()} placeholder="e.g. CSCI 567, EE 559" data-testid="input-manual-course" />
                <Button variant="outline" onClick={addManual} data-testid="button-add-manual"><Plus className="size-4" />Add</Button>
              </div>
            </div>
            {outside.length > 0 && (
              <div className="mt-3 rounded-lg bg-accent/20 border border-accent/50 p-3" data-testid="list-outside-demo">
                <p className="text-xs font-semibold mb-2">Outside this selected course subset — recorded for prerequisite checks, but not offered as a planning option here.</p>
                <div className="flex flex-wrap gap-1.5">
                  {outside.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 text-xs font-mono bg-card border rounded-full pl-2.5 pr-1 py-0.5">{c}
                      <button aria-label={`Remove ${c}`} onClick={() => toggleCompleted(c)} className="p-0.5 rounded-full hover:bg-secondary" data-testid={`button-remove-${c}`}><X className="size-3" /></button></span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <StarsImport catalogKnown={known} onApply={(codes) => { set({ completedCourses: Array.from(new Set([...input.completedCourses, ...codes])).slice(0, 100) }); toast({ title: `Added ${codes.length} completed course${codes.length === 1 ? '' : 's'}` }); }} />
      </div>
      <p className="text-center text-xs text-muted-foreground mt-8"><Link href="/" className="underline">Back to the planner</Link></p>
    </div>
  );
}

function StarsImport({ catalogKnown, onApply }: { catalogKnown: Set<string>; onApply: (codes: string[]) => void }) {
  const parse = useParseStars();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [stage, setStage] = useState<'idle' | 'extracting' | 'no-text' | 'ocr' | 'ready'>('idle');
  const [ocrMsg, setOcrMsg] = useState({ msg: '', pct: 0 });
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [res, setRes] = useState<StarsResult | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const onFile = async (f: File) => {
    setFile(f); setFileErr(null); setRes(null); setStage('extracting');
    try {
      const { text: t } = await extractPdfText(f);
      if (t.replace(/\s/g, '').length < 20) { setStage('no-text'); setText(''); }
      else { setText(t); setStage('ready'); }
    } catch (e) { setFileErr(errMessage(e)); setStage('idle'); }
  };

  const runOcr = async () => {
    if (!file) return;
    setStage('ocr');
    try {
      const t = await ocrPdf(file, (msg, pct) => setOcrMsg({ msg, pct }));
      setText(t); setStage('ready');
    } catch (e) { setFileErr(`OCR failed: ${errMessage(e)}`); setStage('no-text'); }
  };

  const submit = async () => {
    try {
      const r = await parse.mutateAsync({ data: { text: text.slice(0, 100000) } });
      setRes(r);
      setPicked(new Set(r.completedCandidates));
      setText(''); setFile(null); setStage('idle');
      if (fileRef.current) fileRef.current.value = '';
    } catch { /* shown below */ }
  };

  return (
    <section className="rounded-xl border bg-card p-5 self-start" data-testid="panel-stars">
      <div className="flex items-center gap-2"><FileSearch className="size-5 text-primary" /><h2 className="text-base font-semibold">Import from a STARS report</h2></div>
      <p className="text-xs text-muted-foreground mt-1">Your PDF file stays in this browser. When you click Find course candidates, the extracted text is sent to the TrojanPlanner backend parser; it is not saved here or there by this app. Results are candidates for you to confirm.</p>

      <div className="mt-4 rounded-lg border-2 border-dashed p-5 text-center hover:border-primary/50 transition-colors">
        <Upload className="size-6 mx-auto text-muted-foreground" />
        <label className="block mt-2 text-sm font-medium cursor-pointer text-primary">
          Choose STARS PDF
          <input ref={fileRef} type="file" accept="application/pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} data-testid="input-stars-file" />
        </label>
        {file && <p className="text-xs font-mono mt-1 text-muted-foreground">{file.name}</p>}
      </div>
      {stage === 'extracting' && <p className="text-xs mt-2 animate-pulse" aria-live="polite">Reading the PDF text layer…</p>}
      {fileErr && <p className="text-xs text-destructive mt-2" role="alert">{fileErr}</p>}
      {(stage === 'no-text' || stage === 'ocr') && (
        <div className="mt-3 rounded-lg bg-accent/20 border border-accent/50 p-3 text-xs space-y-2" data-testid="status-image-only">
          <p><strong>This PDF is image-only</strong> (a scan with no text layer). You can run local OCR, which recognizes text on this device. It is slower (often 10–40s per page) and can misread codes, so review the result. OCR is not fully offline: the OCR engine and English language data are downloaded from a public CDN on first use. The PDF itself is processed on this device; the recognized text is sent to the backend only when you ask for candidates. Or paste text below.</p>
          {stage === 'ocr' ? (
            <div aria-live="polite"><p className="mb-1">{ocrMsg.msg || 'Starting OCR…'}</p><Progress value={ocrMsg.pct * 100} /></div>
          ) : <Button size="sm" onClick={runOcr} data-testid="button-run-ocr"><ScanText className="size-4" />Run local OCR</Button>}
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="stars-text">Extracted or pasted text</Label>
        <Textarea id="stars-text" rows={7} value={text} onChange={(e) => { setText(e.target.value); if (e.target.value) setStage('ready'); }} maxLength={100000}
          placeholder={'Paste STARS rows, e.g.\n20251 CSCI 103 4.0 A Introduction to Programming'} className="font-mono text-xs" data-testid="input-stars-text" />
        <p className="text-[11px] text-muted-foreground">Rows marked RG (current registration) or IP (in progress) are never counted as completed.</p>
      </div>
      <Button className="w-full mt-3" onClick={submit} disabled={!text.trim() || parse.isPending} data-testid="button-parse-stars">{parse.isPending ? 'Finding course rows…' : 'Find course candidates'}</Button>
      {parse.isError && <p className="text-xs text-destructive mt-2 flex gap-1.5" role="alert"><AlertTriangle className="size-3.5" />Parser error: {errMessage(parse.error)}</p>}

      {res && (
        <div className="mt-5 border-t pt-4 space-y-3 rise" data-testid="panel-stars-review">
          <p className="text-xs font-mono text-muted-foreground">Detected format: {res.detectedFormat}</p>
          {res.warnings.map((w, i) => <p key={i} className="text-xs flex gap-1.5 text-amber-800"><AlertTriangle className="size-3.5 shrink-0" />{w}</p>)}
          <div>
            <p className="text-sm font-semibold mb-1.5">Completed candidates — confirm each</p>
            {res.completedCandidates.length === 0 ? <p className="text-xs italic text-muted-foreground">None found.</p> : (
              <div className="flex flex-wrap gap-1.5">
                {res.completedCandidates.map((c) => (
                  <label key={c} className={cn('flex items-center gap-1.5 text-xs font-mono rounded-md border px-2 py-1 cursor-pointer', picked.has(c) && 'border-primary bg-primary/5')}>
                    <Checkbox checked={picked.has(c)} onCheckedChange={() => setPicked((p) => { const n = new Set(p); if (n.has(c)) n.delete(c); else n.add(c); return n; })} data-testid={`checkbox-stars-${c}`} />
                    {c}{!catalogKnown.has(c) && <span className="text-[9px] text-muted-foreground">(outside demo)</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
          {res.inProgressCandidates.length > 0 && (
            <div>
              <p className="text-sm font-semibold">In progress / registered — not counted</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">{res.inProgressCandidates.join(', ')}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRes(null)} data-testid="button-stars-discard">Discard</Button>
            <Button size="sm" className="flex-1" disabled={!picked.size} onClick={() => { onApply(Array.from(picked)); setRes(null); }} data-testid="button-stars-apply">Add {picked.size} as completed</Button>
          </div>
        </div>
      )}
    </section>
  );
}

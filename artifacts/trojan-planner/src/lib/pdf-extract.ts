// Browser-local PDF text extraction and optional OCR. Nothing is uploaded except
// the extracted text the user explicitly sends to the parser.

async function loadPdf(file: File) {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

export async function extractPdfText(file: File): Promise<{ text: string; pages: number }> {
  const doc = await loadPdf(file);
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Preserve line breaks (hasEOL, or y-position changes) so each course row stays on its own line.
    let line = '';
    let lastY: number | null = null;
    const lines: string[] = [];
    for (const it of content.items) {
      if (!('str' in it)) continue;
      const y = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2 && line.trim()) { lines.push(line.trim()); line = ''; }
      line += (line && !line.endsWith(' ') ? ' ' : '') + it.str;
      lastY = y;
      if (it.hasEOL) { if (line.trim()) lines.push(line.trim()); line = ''; lastY = null; }
    }
    if (line.trim()) lines.push(line.trim());
    out.push(lines.join('\n'));
  }
  return { text: out.join('\n').trim(), pages: doc.numPages };
}

export async function ocrPdf(file: File, onProgress: (msg: string, pct: number) => void): Promise<string> {
  const doc = await loadPdf(file);
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  const out: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress(`Recognizing page ${i} of ${doc.numPages}`, (i - 1) / doc.numPages);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
      const { data } = await worker.recognize(canvas);
      out.push(data.text);
      canvas.width = 0;
    }
  } finally {
    await worker.terminate();
  }
  onProgress('Done', 1);
  return out.join('\n');
}

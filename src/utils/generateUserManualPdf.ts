import { jsPDF } from 'jspdf';

export interface PdfProgressCallback {
  (current: number, total: number, stageName: string): void;
}

export interface GeneratePdfOptions {
  onProgress?: PdfProgressCallback;
  autoDownload?: boolean;
  filename?: string;
}

export interface GeneratePdfResult {
  doc: jsPDF | null;
  blob: Blob;
  blobUrl: string;
  totalPages: number;
  pageImages: string[];
}

/**
 * Provides the official, ready-for-download User Manual PDF.
 * Avoids browser-side canvas rendering issues, Cyrillic font corruptions,
 * and iframe freezes by serving the pre-built, print-ready, 15-page vector PDF.
 */
export async function generateUserManualPdf(options: GeneratePdfOptions = {}): Promise<GeneratePdfResult> {
  const { onProgress, autoDownload = false, filename = 'Posibnyk_Korystuvacha_SKUD_412_Nemesis.pdf' } = options;

  onProgress?.(1, 2, 'Підготовка готового посібника...');

  const pdfUrl = '/Posibnyk_Korystuvacha_SKUD_412_Nemesis.pdf';

  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      throw new Error(`Не вдалося завантажити файл ${pdfUrl}: HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    onProgress?.(2, 2, 'Файл готовий до завантаження!');

    if (autoDownload) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    return {
      doc: null,
      blob,
      blobUrl,
      totalPages: 15,
      pageImages: [],
    };
  } catch (err) {
    console.error('Error fetching ready PDF:', err);
    // Fallback direct link
    if (autoDownload) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    const fallbackBlob = new Blob([], { type: 'application/pdf' });
    return {
      doc: null,
      blob: fallbackBlob,
      blobUrl: pdfUrl,
      totalPages: 15,
      pageImages: [],
    };
  }
}

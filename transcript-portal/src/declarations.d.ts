declare interface Window {
  PaystackPop: {
    setup(config: Record<string, unknown>): { openIframe(): void };
  };
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  export default function autoTable(
    doc: jsPDF,
    options: Record<string, unknown>
  ): void;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => void;
    lastAutoTable: { finalY: number };
  }
}

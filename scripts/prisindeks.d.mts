export function loadPrisindeks(): {
  title: string;
  lead: string;
  collected: string;
  period: string;
  periodLabel: string;
  guide: string;
  csv: string;
  guests: number;
  stores: { name: string; total: string; perChild: string; cheapest?: boolean }[];
};
export function prisindeksTeaserHtml(): string;
export function prisindeksDataset(data: ReturnType<typeof loadPrisindeks>, site: string): Record<string, unknown>;

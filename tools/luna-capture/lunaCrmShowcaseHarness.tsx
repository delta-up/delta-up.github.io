// Marketing capture only (not committed): the real CRM page with an in-memory adapter and an industrial-equipment seller's demo data.
import '../../../index.css';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { CrmPage } from '../../../features/crm';

const W = 'demo-ws';
const day = 86400000;
const NOW = Date.parse('2026-10-29T09:00:00Z');
const iso = (offsetDays: number) => new Date(NOW - offsetDays * day).toISOString();
const STAGES = [['سرنخ جدید', 10, '#a78bfa'], ['نیازسنجی فنی', 30, '#38bdf8'], ['پیش‌فاکتور', 55, '#fbbf24'], ['مذاکره', 75, '#34d399']] as const;
type Seed = [string, string, string, string, number, number, string, string, string];
// company, contact, title, channel, amount (Toman), stage, temperature, variant, next step
const SEED: Seed[] = [
  ['سیمان البرزکوه', 'مهندس توکلی', 'کمپرسور اسکرو ۷۵ کیلووات', 'telegram', 2450000000, 3, 'call_ready', 'masculine', 'ارسال قرارداد نهایی'],
  ['آب‌شیرین‌کن کیش‌آب', 'خانم صدری', 'پمپ طبقاتی فشار قوی × ۲', 'website', 1700000000, 3, 'warm', 'feminine', 'جلسهٔ فنی با مدیر تولید'],
  ['لبنیات دشت‌سبز', 'مهندس رحیمی', 'پمپ سانتریفیوژ استیل × ۴', 'whatsapp', 680000000, 2, 'warm', 'masculine', 'پیگیری پیش‌فاکتور'],
  ['بسته‌بندی نگین‌پک', 'آقای فرهادی', 'شیر پروانه‌ای DN200 × ۲۴', 'whatsapp', 430000000, 2, 'warming', 'masculine', 'ارسال کاتالوگ فنی'],
  ['کاشی آرین‌سرام', 'مهندس نوری', 'الکتروموتور ۱۱۰ کیلووات', 'website', 1150000000, 1, 'warming', 'feminine', 'بازدید از خط'],
  ['صنایع غذایی ماهان', 'آقای شریفی', 'تابلو برق MCC', 'lead_finder', 890000000, 1, 'cold', 'masculine', 'تماس معرفی'],
  ['ریخته‌گری سپهر', 'مهندس امینی', 'گیربکس صنعتی و کوپلینگ', 'instagram', 520000000, 0, 'cold', 'masculine', 'تماس اول'],
  ['نساجی بافت‌نو', 'خانم کریمی', 'بلبرینگ صنعتی · قرارداد سالانه', 'telegram', 360000000, 0, 'very_cold', 'feminine', 'ارسال لیست قیمت'],
];
export const ARRIVALS: Seed[] = [
  ['رب گلستان', 'مهندس کاظمی', 'پمپ لجن‌کش خط تولید', 'whatsapp', 310000000, 0, 'warming', 'masculine', 'تماس امروز'],
  ['فولادکاران زاگرس', 'آقای مرادی', 'کمپرسور هوای ۳۷ کیلووات', 'instagram', 980000000, 0, 'warm', 'masculine', 'تماس امروز'],
  ['پارس‌کارتن', 'خانم احمدی', 'الکتروموتور ضدانفجار', 'telegram', 450000000, 0, 'warming', 'feminine', 'تماس امروز'],
  ['شهرک صنعتی شمس‌آباد · واحد ۱۲', 'مهندس یزدانی', 'اینورتر ۵۵ کیلووات × ۳', 'website', 640000000, 0, 'call_ready', 'masculine', 'تماس فوری'],
  ['لوله‌سازی آرمان‌پلی', 'آقای جعفری', 'گیربکس حلزونی', 'whatsapp', 270000000, 0, 'cold', 'masculine', 'تماس امروز'],
];

const stages = STAGES.map(([name, probability, color], i) => ({ id: `s${i}`, name, color, probability, rottingDays: 7, sortOrder: i }));
const members = [{ id: 'm1', name: 'سارا محمدی', avatarUrl: null }, { id: 'm2', name: 'امیر حسینی', avatarUrl: null }];
const customers: Record<string, unknown>[] = [];
const deals: Record<string, unknown>[] = [];
let sort = 0;
function add([company, contact, title, channel, amount, stage, temperature, variant, next]: Seed, ageDays: number) {
  const n = deals.length;
  customers.push({ id: `c${n}`, name: contact, phone: `0912${String(1000000 + n * 7919).slice(-7)}`, secondPhone: null, companyName: company, avatarUrl: null, temperature, avatarVariant: variant });
  deals.push({ id: `d${n}`, title, stageId: `s${stage}`, customerId: `c${n}`, contactName: contact, companyName: company, phone: null, amount, expectedCloseDate: iso(-14 - n), ownerId: n % 2 ? 'm2' : 'm1', status: 'open', lostReason: null, closedAt: null, source: channel === 'manual' ? 'manual' : 'intake', channel, isDemo: false, nextStepText: next, nextStepAt: iso(-1 - (n % 3)), sortOrder: sort--, stageEnteredAt: iso(ageDays), createdAt: iso(ageDays) });
}
SEED.forEach((s, i) => add(s, 2 + i));
deals.push({ ...deals[0], id: 'won1', title: 'پمپ آتش‌نشانی', status: 'won', closedAt: iso(9), amount: 1200000000 });

const overview = (customerId: string, dealId: string | null) => {
  const c = customers.find((x) => x.id === customerId)!;
  const d = deals.find((x) => x.id === dealId) ?? deals.find((x) => x.customerId === customerId)!;
  const metric = (amount: string, tier: string) => ({ status: 'available', amount, tier, asOf: iso(2), sourceNote: 'دادهٔ نمایشی', recordedBy: 'm1', version: 1 });
  return {
    workspaceId: W, customerId, isDemo: true,
    segment: { id: 'seg1', name: 'صنایع بزرگ', iconKey: 'enterprise', version: 1 },
    assessment: { version: 1, avatarVariant: c.avatarVariant, temperature: c.temperature, trend: 'rising', reason: 'دو بار در هفته پیگیری کرده و پیش‌فاکتور خواسته', assessedAt: iso(1), reviewAt: null },
    access: { canReadMoney: true, canWriteMoney: true, canEditAssessment: true, canEditAppearance: true },
    financial: {
      settings: { version: 1, displayCurrency: 'IRT', profitBasis: 'net', goldFrom: '300000000', diamondFrom: '1000000000' },
      earned: Number(customerId.slice(1)) >= 9 ? { status: 'unknown', amount: null, tier: 'neutral', asOf: null, sourceNote: '', recordedBy: null, version: 1 } : metric('1240000000', 'diamond'), potential: metric(String(Math.round(Number(d.amount) * 0.22)), 'gold'),
      selectedDealId: d.id, ratio: 0.62, scale: { key: 'k', maxAmount: '2000000000', asOf: iso(1) },
      deals: [{ id: d.id, title: d.title }], comparison: [], totalCustomers: customers.length, knownEstimates: 6, openDeals: 9,
    },
  };
};
const timeline = [
  { kind: 'event', id: 'e1', at: iso(0.2), type: 'note', fromStageName: null, toStageName: null, body: 'در واتس‌اپ زمان تحویل و گارانتی را پرسید.', actorId: 'm1' },
  { kind: 'event', id: 'e2', at: iso(3), type: 'stage', fromStageName: 'پیش‌فاکتور', toStageName: 'مذاکره', body: null, actorId: 'm1' },
  { kind: 'event', id: 'e3', at: iso(8), type: 'created', fromStageName: null, toStageName: null, body: null, actorId: 'm1' },
];
let lastSync = { created: 0, existing: deals.length, byChannel: {}, errors: {}, syncedAt: new Date().toISOString() };

api.defaults.adapter = async (config) => {
  const url = config.url ?? '';
  const ok = (data: unknown) => ({ data: structuredClone(data), status: 200, statusText: 'OK', headers: {}, config });
  if (url.endsWith('/bootstrap')) return ok({ stages, deals, customers, members });
  if (url.endsWith('/intake/status')) return ok({ demo: { active: false, customers: 0, deals: 0 }, sources: { whatsapp: true, telegram: true, lead_finder: true }, liveDeals: {}, lastSync });
  if (url.endsWith('/intake/sync')) return ok(lastSync);
  if (url.endsWith('/timeline')) return ok(timeline);
  const m = url.match(/customer-overview\/customers\/([^/?]+)/);
  if (m) return ok(overview(decodeURIComponent(m[1]!), (config.params?.dealId as string) ?? null));
  return ok({});
};

const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity } } });
const w = window as Window & { __crmArrive: (i: number) => Promise<void>; __crmWarm: (dealId: string, temperature: string) => Promise<void>; __crmMove: (dealId: string, stage: number) => Promise<void> };
const refresh = () => client.invalidateQueries({ queryKey: ['crm', W] });
w.__crmArrive = async (i) => { add(ARRIVALS[i]!, 0); lastSync = { ...lastSync, created: 1, syncedAt: new Date().toISOString() }; await refresh(); };
w.__crmWarm = async (dealId, temperature) => { const d = deals.find((x) => x.id === dealId)!; const c = customers.find((x) => x.id === d.customerId)!; c.temperature = temperature; await refresh(); };
w.__crmMove = async (dealId, stage) => { const d = deals.find((x) => x.id === dealId)!; d.stageId = `s${stage}`; d.sortOrder = sort--; await refresh(); };

export function mountLunaCrmShowcase() {
  localStorage.setItem('crm:board-view:v1', JSON.stringify({ density: 'detailed', showStats: true, showChannels: true, showTemperature: true }));
  createRoot(document.getElementById('test-root')!).render(<QueryClientProvider client={client}><CrmPage workspaceId={W} currentUserId="m1" /></QueryClientProvider>);
}

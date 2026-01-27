export type MarketplaceLocale = 'en' | 'it';

type MarketplaceCopy = {
  title: string;
  subtitle: string;
  balanceLabel: string;
  balanceNote: string;
  badgeForever: string;
  badgeRetake: string;
  emptyTitle: string;
  emptyBody: string;
  statusFailed: string;
  statusPastDue: string;
  afterPurchase: string;
  afterPurchaseEmphasis: string;
  buyCta: string;
  buyCtaBusy: string;
  priceFree: string;
  needMore: (value: string) => string;
};

export const marketplaceCopy: Record<MarketplaceLocale, MarketplaceCopy> = {
  en: {
    title: 'Turn your savings into second chances.',
    subtitle: 'Missed a deadline or failed a lesson? Use your platform savings to unlock it forever and retake it on your own time.',
    balanceLabel: 'Savings balance',
    balanceNote: '',
    badgeForever: 'Purchased lessons never expire',
    badgeRetake: 'Retake anytime after purchase',
    emptyTitle: "You're all caught up.",
    emptyBody: 'No past-due or failed lessons are waiting in the marketplace right now.',
    statusFailed: 'Failed',
    statusPastDue: 'Past Due',
    afterPurchase: 'After purchase:',
    afterPurchaseEmphasis: 'Available forever',
    buyCta: 'Buy now',
    buyCtaBusy: 'Unlocking…',
    priceFree: 'Free',
    needMore: (value) => `You need ${value} more in savings to unlock this lesson.`,
  },
  it: {
    title: 'Trasforma i tuoi risparmi in seconde occasioni.',
    subtitle: 'Hai mancato una scadenza o fallito una lezione? Usa i risparmi della piattaforma per sbloccarla per sempre e rifarla quando vuoi.',
    balanceLabel: 'Saldo risparmi',
    balanceNote: '',
    badgeForever: 'Le lezioni acquistate non scadono mai',
    badgeRetake: 'Rifalla quando vuoi dopo l’acquisto',
    emptyTitle: 'Sei in pari.',
    emptyBody: 'Al momento non ci sono lezioni scadute o fallite nel marketplace.',
    statusFailed: 'Fallita',
    statusPastDue: 'Scaduta',
    afterPurchase: 'Dopo l’acquisto:',
    afterPurchaseEmphasis: 'Disponibile per sempre',
    buyCta: 'Compra ora',
    buyCtaBusy: 'Sblocco…',
    priceFree: 'Gratis',
    needMore: (value) => `Ti servono ancora ${value} di risparmi per sbloccare questa lezione.`,
  },
};

export type NavLocale = "en" | "it";

export type NavCopy = {
  impersonatingPrefix: string;
  stopImpersonating: string;
  userManagement: string;
  lessonManagement: string;
  referralDashboard: string;
  emailEditor: string;
  dashboardSettings: string;
  cronTestPage: string;
  manageClasses: string;
  settings: string;
  sendNotes: string;
  profile: string;
  adminDashboard: string;
  whatsNew: string;
  rateTeacher: string;
  sendFeedback: string;
  signOut: string;
  benefits: string;
  testimonials: string;
  signIn: string;
  startFreeTrial: string;
  myFinance: string;
  marketplace: string;
  extras: string;
  extrasTitle: string;
  extrasSubtitle: string;
};

export const navCopy: Record<NavLocale, NavCopy> = {
  en: {
    impersonatingPrefix: "You are impersonating",
    stopImpersonating: "Stop Impersonating",
    userManagement: "User Management",
    lessonManagement: "Lesson Management",
    referralDashboard: "Referral Dashboard",
    emailEditor: "Email Editor",
    dashboardSettings: "Dashboard Settings",
    cronTestPage: "Cron Test Page",
    manageClasses: "Manage Classes",
    settings: "Settings",
    sendNotes: "Send notes to students",
    profile: "Profile",
    adminDashboard: "Admin dashboard",
    whatsNew: "What's new",
    rateTeacher: "Rate your teacher",
    sendFeedback: "Send Feedback",
    signOut: "Sign Out",
    benefits: "Benefits",
    testimonials: "Testimonials",
    signIn: "Sign In",
    startFreeTrial: "Start Free Trial",
    myFinance: "My Finance",
    marketplace: "Marketplace",
    extras: "Extras",
    extrasTitle: "Extras",
    extrasSubtitle: "Quick access to your tools and shortcuts.",
  },
  it: {
    impersonatingPrefix: "Stai impersonando",
    stopImpersonating: "Interrompi impersonificazione",
    userManagement: "Gestione utenti",
    lessonManagement: "Gestione lezioni",
    referralDashboard: "Dashboard referenze",
    emailEditor: "Editor email",
    dashboardSettings: "Impostazioni dashboard",
    cronTestPage: "Pagina test cron",
    manageClasses: "Gestisci classi",
    settings: "Impostazioni",
    sendNotes: "Invia note agli studenti",
    profile: "Profilo",
    adminDashboard: "Dashboard admin",
    whatsNew: "Novita",
    rateTeacher: "Valuta il tuo insegnante",
    sendFeedback: "Invia feedback",
    signOut: "Esci",
    benefits: "Vantaggi",
    testimonials: "Testimonianze",
    signIn: "Accedi",
    startFreeTrial: "Inizia prova gratuita",
    myFinance: "Le mie finanze",
    marketplace: "Mercato",
    extras: "Extra",
    extrasTitle: "Extra",
    extrasSubtitle: "Accesso rapido agli strumenti e scorciatoie.",
  },
};

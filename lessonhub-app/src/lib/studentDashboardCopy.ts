export type StudentDashboardLocale = "en" | "it";

export const studentDashboardCopy: Record<
  StudentDashboardLocale,
  {
    stats: {
      progressTitle: string;
      progressPoints: string;
      progressBody: string;
      investLink: string;
      aboutTitle: string;
      aboutBody: string;
      assignmentSummary: string;
      assignmentSummaryBadge: string;
      labels: {
        total: string;
        pending: string;
        submitted: string;
        graded: string;
        pastDue: string;
        failed: string;
      };
    };
    lessons: {
      searchPlaceholder: string;
      empty: string;
      browseTeachers: string;
    };
    guides: {
      tabLabel: string;
      bannerKicker: string;
      bannerTitle: string;
      bannerBody: string;
      bannerCta: string;
      countSingle: string;
      countPlural: string;
      countZero: string;
      searchPlaceholder: string;
      emptyPaid: string;
      emptyFree: string;
    };
  }
> = {
  en: {
    stats: {
      progressTitle: "My Progress",
      progressPoints: "{points} pts earned",
      progressBody: "Total value from all graded lessons.",
      investLink: "Invest in your future - watch now",
      aboutTitle: 'About "My Progress"',
      aboutBody:
        "What you would have spent with a traditional teaching method. Nice savings!",
      assignmentSummary: "MY WORK",
      assignmentSummaryBadge: "FILTERS",
      labels: {
        total: "Total",
        pending: "Pending",
        submitted: "Submitted",
        graded: "Graded",
        pastDue: "Past Due",
        failed: "Failed",
      },
    },
    lessons: {
      searchPlaceholder: "Search by title or teacher...",
      empty: "You have no assignments yet.",
      browseTeachers: "Browse teachers directory",
    },
    guides: {
      tabLabel: "Hub Guides",
      bannerKicker: "Hub Guides",
      bannerTitle: "Always-on practice hub",
      bannerBody:
        "Guides are always ready for practice. No deadlines, no expirations, no grading—just a pure knowledge stream into your brain vessels. Some guides are free and a ton of others are for a small token of cash. Upgrade to unlock interactive guides between lessons.",
      bannerCta: "Unlock Hub Guides",
      countSingle: "{count} guide available",
      countPlural: "{count} guides available",
      countZero: "New guides arriving soon",
      searchPlaceholder: "Search Hub Guides...",
      emptyPaid: "New guides are on the way. Stay tuned!",
      emptyFree: "No free guides are available right now. Upgrade to access the full library.",
    },
  },
  it: {
    stats: {
      progressTitle: "I miei progressi",
      progressPoints: "{points} punti ottenuti",
      progressBody: "Valore totale di tutte le lezioni valutate.",
      investLink: "Investi sul tuo futuro - guarda ora",
      aboutTitle: 'Info su "I miei progressi"',
      aboutBody:
        "Quanto avresti speso con un metodo tradizionale. Ottimo risparmio!",
      assignmentSummary: "IL MIO LAVORO",
      assignmentSummaryBadge: "FILTRI",
      labels: {
        total: "Totale",
        pending: "In corso",
        submitted: "Inviati",
        graded: "Corretti",
        pastDue: "In ritardo",
        failed: "Non superati",
      },
    },
    lessons: {
      searchPlaceholder: "Cerca per titolo o insegnante...",
      empty: "Non hai ancora compiti assegnati.",
      browseTeachers: "Vai al catalogo insegnanti",
    },
    guides: {
      tabLabel: "Hub Guides",
      bannerKicker: "Hub Guides",
      bannerTitle: "Hub sempre attivo",
      bannerBody:
        "Le guide sono sempre pronte per esercitarti. Niente scadenze o voti: solo contenuti per migliorare. Alcune sono gratuite, altre richiedono un piccolo contributo. Fai upgrade per sbloccare guide interattive tra una lezione e l'altra.",
      bannerCta: "Sblocca le Hub Guides",
      countSingle: "{count} guida disponibile",
      countPlural: "{count} guide disponibili",
      countZero: "Nuove guide in arrivo",
      searchPlaceholder: "Cerca nelle Hub Guides...",
      emptyPaid: "Nuove guide stanno arrivando. Resta sintonizzato!",
      emptyFree: "Nessuna guida gratuita disponibile ora. Fai upgrade per accedere alla libreria completa.",
    },
  },
};

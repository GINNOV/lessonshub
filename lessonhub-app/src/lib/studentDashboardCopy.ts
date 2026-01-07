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
      card: {
        viewResults: string;
        practiceAgain: string;
        shareLinkLabel: string;
        shareLinkTitle: string;
        viewTeacherTitle: string;
        unassignedTeacher: string;
        unassignedTeacherAlt: string;
        submittedCountTitle: string;
        submittedCountShort: string;
        difficultyLabels: string[];
        difficultySrPrefix: string;
        status: {
          graded: string;
          failed: string;
          submitted: string;
          pastDue: string;
          pending: string;
          gradedScore: string;
        };
        scoreEmpty: string;
        shareLinkError: string;
        shareLinkCopied: string;
        shareLinkReady: string;
        shareLinkCopyError: string;
        dueLabel: string;
        extendedLabel: string;
        originalLabel: string;
      };
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
    gamification: {
      recentActivityTitle: string;
      recentActivityEmpty: string;
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
      card: {
        viewResults: "View Results",
        practiceAgain: "Practice this lesson again",
        shareLinkLabel: "Copy lesson share link",
        shareLinkTitle: "Copy lesson share link",
        viewTeacherTitle: "View {teacher}'s profile",
        unassignedTeacher: "Unassigned",
        unassignedTeacherAlt: "Unassigned teacher",
        submittedCountTitle: "{submitted} of {total} students have submitted",
        submittedCountShort: "{submitted} of {total}",
        difficultyLabels: ["Super Simple", "Approachable", "Intermediate", "Challenging", "Advanced"],
        difficultySrPrefix: "Lesson difficulty:",
        status: {
          graded: "Graded",
          failed: "Failed",
          submitted: "Submitted",
          pastDue: "Past Due",
          pending: "Pending",
          gradedScore: "Graded: {score}/10",
        },
        scoreEmpty: "—",
        shareLinkError: "Failed to generate share link.",
        shareLinkCopied: "Lesson link copied to clipboard.",
        shareLinkReady: "Lesson link ready to share.",
        shareLinkCopyError: "Unable to copy share link.",
        dueLabel: "Due",
        extendedLabel: "Extended",
        originalLabel: "Original:",
      },
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
    gamification: {
      recentActivityTitle: "Recent activity",
      recentActivityEmpty: "Points updates will appear here once your next lesson is graded.",
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
      card: {
        viewResults: "Vedi risultati",
        practiceAgain: "Ripeti questa lezione",
        shareLinkLabel: "Copia link di condivisione",
        shareLinkTitle: "Copia link di condivisione",
        viewTeacherTitle: "Vedi il profilo di {teacher}",
        unassignedTeacher: "Non assegnato",
        unassignedTeacherAlt: "Insegnante non assegnato",
        submittedCountTitle: "{submitted} su {total} studenti hanno inviato",
        submittedCountShort: "{submitted} su {total}",
        difficultyLabels: ["Facilissimo", "Accessibile", "Intermedio", "Impegnativo", "Avanzato"],
        difficultySrPrefix: "Difficoltà lezione:",
        status: {
          graded: "Corretto",
          failed: "Non superato",
          submitted: "Inviato",
          pastDue: "In ritardo",
          pending: "In corso",
          gradedScore: "Voto: {score}/10",
        },
        scoreEmpty: "—",
        shareLinkError: "Impossibile generare il link di condivisione.",
        shareLinkCopied: "Link della lezione copiato negli appunti.",
        shareLinkReady: "Link della lezione pronto per la condivisione.",
        shareLinkCopyError: "Impossibile copiare il link di condivisione.",
        dueLabel: "Scadenza",
        extendedLabel: "Estesa",
        originalLabel: "Originale:",
      },
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
    gamification: {
      recentActivityTitle: "Attività recente",
      recentActivityEmpty: "Gli aggiornamenti dei punti appariranno qui dopo la prossima lezione corretta.",
    },
  },
};

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
      title: string;
      toggleShow: string;
      toggleHide: string;
      summaryLine1: string;
      summaryLine2: string;
      lifetimePointsLabel: string;
      badgesUnlockedLabel: string;
      guidesCompletedLabel: string;
      goldStarsReceivedLabel: string;
      firstBadgeEmpty: string;
      nextUpTitle: string;
      nextUpSubtitle: string;
      allBadgesUnlocked: string;
      earnedLabel: string;
      pointsSuffix: string;
      recentActivityTitle: string;
      recentActivityEmpty: string;
      reasonLabels: Record<string, string>;
      categoryLabels: {
        PROGRESSION: string;
        PERFORMANCE: string;
        PARTICIPATION: string;
      };
    };
    leaderboard: {
      title: string;
      subtitle: string;
      rankLabel: string;
      studentLabel: string;
      pointsLabel: string;
      completedLabel: string;
      avgTimeLabel: string;
      savingsLabel: string;
      badgesLabel: string;
      anonymousLabel: string;
      durationEmpty: string;
      emptyTable: string;
      emptyList: string;
      testsTakenLabel: string;
      pointsSuffix: string;
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
      title: "Achievements",
      toggleShow: "Show achievements",
      toggleHide: "Hide achievements",
      summaryLine1: "Track the points and badges you've earned so far.",
      summaryLine2:
        "Earn points to unlock extras like new opportunities and deadline extensions. Every badge adds bonus points.",
      lifetimePointsLabel: "Lifetime points",
      badgesUnlockedLabel: "Badges unlocked",
      guidesCompletedLabel: "Guides completed",
      goldStarsReceivedLabel: "Gold stars received",
      firstBadgeEmpty:
        "Your first badge is just a lesson away. Submit a graded lesson to start collecting rewards.",
      nextUpTitle: "Next up",
      nextUpSubtitle: "Peek at your upcoming rewards.",
      allBadgesUnlocked:
        "You've unlocked every badge currently available. Legendary status!",
      earnedLabel: "Earned {date}",
      pointsSuffix: "pts",
      recentActivityTitle: "Recent activity",
      recentActivityEmpty: "Points updates will appear here once your next lesson is graded.",
      reasonLabels: {
        ASSIGNMENT_GRADED: "Assignment graded",
        BADGE_BONUS: "Badge bonus",
        MANUAL_ADJUSTMENT: "Adjustment",
        ARKANING_GAME: "ArkanING game",
      },
      categoryLabels: {
        PROGRESSION: "Progression",
        PERFORMANCE: "Performance",
        PARTICIPATION: "Participation",
      },
    },
    leaderboard: {
      title: "🏆 Student Leaderboard",
      subtitle: "Showing top 12 peers in your network.",
      rankLabel: "Rank",
      studentLabel: "Student",
      pointsLabel: "Points",
      completedLabel: "Completed",
      avgTimeLabel: "Avg. Time",
      savingsLabel: "Savings",
      badgesLabel: "Badges",
      anonymousLabel: "Anonymous",
      durationEmpty: "N/A",
      emptyTable: "No leaderboard activity yet. Submissions and grades will appear here.",
      emptyList: "No leaderboard activity yet.",
      testsTakenLabel: "{count} tests taken",
      pointsSuffix: "pts",
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
      title: "Obiettivi",
      toggleShow: "Mostra obiettivi",
      toggleHide: "Nascondi obiettivi",
      summaryLine1: "Tieni traccia dei punti e dei badge ottenuti finora.",
      summaryLine2:
        "Guadagna punti per sbloccare extra come nuove opportunità ed estensioni della scadenza. Ogni badge aggiunge punti bonus.",
      lifetimePointsLabel: "Punti totali",
      badgesUnlockedLabel: "Badge ottenuti",
      guidesCompletedLabel: "Guide completate",
      goldStarsReceivedLabel: "Gold star ricevute",
      firstBadgeEmpty:
        "Il tuo primo badge è a un passo. Completa una lezione corretta per iniziare a collezionare premi.",
      nextUpTitle: "Prossimo obiettivo",
      nextUpSubtitle: "Dai un'occhiata ai prossimi premi.",
      allBadgesUnlocked:
        "Hai sbloccato tutti i badge disponibili. Status leggendario!",
      earnedLabel: "Ottenuto il {date}",
      pointsSuffix: "punti",
      recentActivityTitle: "Attività recente",
      recentActivityEmpty: "Gli aggiornamenti dei punti appariranno qui dopo la prossima lezione corretta.",
      reasonLabels: {
        ASSIGNMENT_GRADED: "Lezione corretta",
        BADGE_BONUS: "Bonus badge",
        MANUAL_ADJUSTMENT: "Modifica",
        ARKANING_GAME: "Gioco ArkanING",
      },
      categoryLabels: {
        PROGRESSION: "Progressione",
        PERFORMANCE: "Prestazioni",
        PARTICIPATION: "Partecipazione",
      },
    },
    leaderboard: {
      title: "🏆 Classifica studenti",
      subtitle: "I primi 12 studenti del tuo gruppo.",
      rankLabel: "Posizione",
      studentLabel: "Studente",
      pointsLabel: "Punti",
      completedLabel: "Completati",
      avgTimeLabel: "Tempo medio",
      savingsLabel: "Risparmi",
      badgesLabel: "Badge",
      anonymousLabel: "Anonimo",
      durationEmpty: "N/D",
      emptyTable: "Nessuna attività in classifica. Le consegne e i voti appariranno qui.",
      emptyList: "Nessuna attività in classifica.",
      testsTakenLabel: "{count} lezioni completate",
      pointsSuffix: "punti",
    },
  },
};

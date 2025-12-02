export type ProfileLocale = "en" | "it";

type ProfileTabs = {
  profile: string;
  about: string;
  billing: string;
  password: string;
  delete: string;
};

type ProfileCopy = {
  headerTitle: string;
  headerSubtitle: string;
  loginHistoryEmpty: string;
  tabs: ProfileTabs;
  profile: {
    title: string;
    picture: string;
    uploading: string;
    name: string;
    email: string;
    emailNote: string;
    gender: string;
    genderOptions: { male: string; female: string; binary: string };
    weeklyLabel: string;
    weeklyDesc: string;
    timeZone: string;
    timeZoneHint: string;
    uiLanguageLabel: string;
    uiLanguageHint: string;
    uiOptions: { device: string; en: string; it: string };
    bioLabel: string;
    bioPlaceholder: string;
    bioHint: string;
    save: string;
    saving: string;
  };
  about: {
    title: string;
    label: string;
    placeholder: string;
    hint: string;
    save: string;
    saving: string;
  };
  billing: {
    title: string;
    subtitle: string;
    badgeActive: string;
    badgeFree: string;
    descriptionActive: string;
    descriptionFree: string;
    couponPlaceholder: string;
    redeem: string;
    redeeming: string;
    couponHint: string;
    support: string;
    supportEmail: string;
  };
  password: {
    title: string;
    newLabel: string;
    confirmLabel: string;
    change: string;
    saving: string;
  };
  breakTab: {
    title: string;
    description: string;
    deleteTitle: string;
    deleteDescription: string;
    confirmLabel: string;
    delete: string;
    deleting: string;
    confirmationText: string;
  };
  toasts: {
    profileSaved: string;
    profileError: string;
    aboutSaved: string;
    aboutError: string;
    aboutUnexpected: string;
    breakOn: string;
    breakOff: string;
    redeemEmpty: string;
    redeemSuccess: string;
    redeemError: string;
    passwordMismatch: string;
    passwordChanged: string;
    passwordError: string;
    deleteConfirmMismatch: string;
    deleteSuccess: string;
    deleteError: string;
  };
};

export const profileCopy: Record<ProfileLocale, ProfileCopy> = {
  en: {
    headerTitle: "Control Center",
    headerSubtitle: "Update your profile and review recent activity.",
    loginHistoryEmpty: "No activity recorded yet.",
    tabs: {
      profile: "Profile",
      about: "About me",
      billing: "Billing",
      password: "Password",
      delete: "Break / delete",
    },
    profile: {
      title: "Update Profile",
      picture: "Profile Picture",
      uploading: "Uploading...",
      name: "Name",
      email: "Email",
      emailNote: "Email addresses cannot be changed.",
      gender: "Gender",
      genderOptions: { male: "male", female: "female", binary: "binary" },
      weeklyLabel: "Weekly summary emails",
      weeklyDesc: "Receive a Sunday recap of your accomplishments.",
      timeZone: "Timezone",
      timeZoneHint: "Used to format deadlines in emails and reminders.",
      uiLanguageLabel: "UI language",
      uiLanguageHint: "We fall back to your browser or device language when set to match device.",
      uiOptions: {
        device: "Match my device (default)",
        en: "English",
        it: "Italiano",
      },
      bioLabel: "Bio",
      bioPlaceholder: "Share a fun fact, learning goal, or what motivates you.",
      bioHint: "Shown on your leaderboard profile so classmates can get to know you.",
      save: "Save Profile Changes",
      saving: "Saving...",
    },
    about: {
      title: "About Me",
      label: "Share something with your students",
      placeholder:
        "Introduce yourself, highlight your teaching style, or share what students can expect from your lessons.",
      hint: "This message appears on the teachers directory for all logged-in students.",
      save: "Save About Me",
      saving: "Saving...",
    },
    billing: {
      title: "Current Plan",
      subtitle: "Your plan includes HUB Guides.",
      badgeActive: "Active",
      badgeFree: "Free",
      descriptionActive: "Your plan has premium content sponsored by your assigned teacher.",
      descriptionFree:
        "Unlock Hub Guides and personal tutoring by subscribing for just 10 euros at month or redeeming a prepaid coupon. Ask your teacher for one!",
      couponPlaceholder: "Enter coupon code",
      redeem: "Redeem",
      redeeming: "Redeeming...",
      couponHint:
        "Received a code from your teacher or the billing team? Enter it above to activate your plan.",
      support: "Need help with billing? Email",
      supportEmail: "billing@quantifythis.com",
    },
    password: {
      title: "Change Password",
      newLabel: "New Password",
      confirmLabel: "Confirm New Password",
      change: "Change Password",
      saving: "Saving...",
    },
    breakTab: {
      title: "Take a break",
      description:
        "Pause all lesson assignments on your dashboard. While on a break you charged only 20% of the current assigned plan. We have cost to run the show too.",
      deleteTitle: "Delete Account",
      deleteDescription:
        "This action is irreversible. All your lessons, assignments, and personal data will be permanently deleted.",
      confirmLabel: 'To confirm, please type: "{text}"',
      delete: "Delete My Account",
      deleting: "Deleting...",
      confirmationText: "Yes, I am sure.",
    },
    toasts: {
      profileSaved: "Profile updated successfully!",
      profileError: "Failed to update profile.",
      aboutSaved: "About me updated successfully!",
      aboutError: "Failed to update About me.",
      aboutUnexpected: "An unexpected error occurred.",
      breakOn: "Lessons are now paused.",
      breakOff: "Lessons are now active.",
      redeemEmpty: "Enter your coupon code first.",
      redeemSuccess: "Coupon applied successfully!",
      redeemError: "Unable to redeem coupon.",
      passwordMismatch: "New passwords do not match.",
      passwordChanged: "Password changed successfully. Please sign in again.",
      passwordError: "Failed to change password.",
      deleteConfirmMismatch: "Please type the confirmation text exactly as shown.",
      deleteSuccess: "Account deleted successfully.",
      deleteError: "Failed to delete account.",
    },
  },
  it: {
    headerTitle: "Centro di controllo",
    headerSubtitle: "Aggiorna il tuo profilo e guarda le ultime attivita.",
    loginHistoryEmpty: "Nessuna attivita registrata.",
    tabs: {
      profile: "Profilo",
      about: "Chi sono",
      billing: "Abbonamento",
      password: "Password",
      delete: "Pausa / elimina",
    },
    profile: {
      title: "Aggiorna profilo",
      picture: "Foto profilo",
      uploading: "Caricamento...",
      name: "Nome",
      email: "Email",
      emailNote: "L'indirizzo email non puo essere modificato.",
      gender: "Genere",
      genderOptions: { male: "uomo", female: "donna", binary: "non binario" },
      weeklyLabel: "Email riepilogo settimanale",
      weeklyDesc: "Ricevi la domenica il riepilogo dei tuoi progressi.",
      timeZone: "Fuso orario",
      timeZoneHint: "Usato per formattare scadenze in email e promemoria.",
      uiLanguageLabel: "Lingua interfaccia",
      uiLanguageHint:
        "Se scegli di seguire il dispositivo, usiamo la lingua del tuo browser o telefono.",
      uiOptions: {
        device: "Segui il mio dispositivo (default)",
        en: "Inglese",
        it: "Italiano",
      },
      bioLabel: "Bio",
      bioPlaceholder:
        "Condividi una curiosita, un obiettivo o cio che ti motiva.",
      bioHint:
        "Mostrata sul tuo profilo in classifica per aiutare i compagni a conoscerti.",
      save: "Salva modifiche profilo",
      saving: "Salvataggio...",
    },
    about: {
      title: "Chi sono",
      label: "Condividi qualcosa con i tuoi studenti",
      placeholder:
        "Presentati, descrivi il tuo stile di insegnamento o cosa aspettarsi dalle lezioni.",
      hint: "Questo testo appare nella directory insegnanti per tutti gli studenti loggati.",
      save: "Salva descrizione",
      saving: "Salvataggio...",
    },
    billing: {
      title: "Piano attuale",
      subtitle: "Il tuo piano include le HUB Guides.",
      badgeActive: "Attivo",
      badgeFree: "Gratuito",
      descriptionActive:
        "Il tuo piano ha contenuti premium offerti dal tuo insegnante assegnato.",
      descriptionFree:
        "Sblocca Hub Guides e tutoring personale abbonandoti a 10 euro al mese o riscattando un coupon prepagato. Chiedi al tuo insegnante!",
      couponPlaceholder: "Inserisci codice coupon",
      redeem: "Riscatta",
      redeeming: "Riscatto...",
      couponHint:
        "Hai ricevuto un codice dal tuo insegnante o dal team billing? Inseriscilo qui per attivare il piano.",
      support: "Serve aiuto con i pagamenti? Scrivi a",
      supportEmail: "billing@quantifythis.com",
    },
    password: {
      title: "Cambia password",
      newLabel: "Nuova password",
      confirmLabel: "Conferma nuova password",
      change: "Cambia password",
      saving: "Salvataggio...",
    },
    breakTab: {
      title: "Metti in pausa",
      description:
        "Metti in pausa tutti i compiti sul tuo dashboard. Durante la pausa paghi solo il 20% del piano assegnato.",
      deleteTitle: "Elimina account",
      deleteDescription:
        "Questa azione e irreversibile. Le tue lezioni, i compiti e i dati personali saranno eliminati definitivamente.",
      confirmLabel: 'Per confermare scrivi: "{text}"',
      delete: "Elimina il mio account",
      deleting: "Eliminazione...",
      confirmationText: "Si, sono sicuro.",
    },
    toasts: {
      profileSaved: "Profilo aggiornato con successo!",
      profileError: "Impossibile aggiornare il profilo.",
      aboutSaved: "Sezione 'Chi sono' aggiornata!",
      aboutError: "Impossibile aggiornare la sezione 'Chi sono'.",
      aboutUnexpected: "Si e verificato un errore inatteso.",
      breakOn: "Le lezioni sono ora in pausa.",
      breakOff: "Le lezioni sono ora attive.",
      redeemEmpty: "Inserisci prima il codice coupon.",
      redeemSuccess: "Coupon applicato con successo!",
      redeemError: "Impossibile riscattare il coupon.",
      passwordMismatch: "Le nuove password non coincidono.",
      passwordChanged: "Password aggiornata. Effettua di nuovo l'accesso.",
      passwordError: "Impossibile cambiare la password.",
      deleteConfirmMismatch: "Scrivi il testo di conferma esattamente come mostrato.",
      deleteSuccess: "Account eliminato con successo.",
      deleteError: "Impossibile eliminare l'account.",
    },
  },
};

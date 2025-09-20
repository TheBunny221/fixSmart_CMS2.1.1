import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import en from "../resources/en.json";
import hi from "../resources/hi.json";
import ml from "../resources/ml.json";
import { mergeWithFallback } from "@/utils/translationHelpers";

// Language type
export type Language = "en" | "hi" | "ml";

// Translation interface
export interface Translation {
  settings: any;
  nav: {
    ward: string;
    profile: string;
    home: string;
    complaints: string;
    myComplaints: string;
    trackStatus: string;
    reports: string;
    users: string;
    dashboard: string;
    maintenance: string;
    settings: string;
    logout: string;
    login: string;
    register: string;
    switchRole: string;
  };
  common: {
    submit: string;
    cancel: string;
    edit: string;
    delete: string;
    save: string;
    close: string;
    view: string;
    search: string;
    filter: string;
    loading: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    confirm: string;
    yes: string;
    no: string;
    next: string;
    previous: string;
    page: string;
    of: string;
    total: string;
    items: string;
    noData: string;
    selectAll: string;
    clear: string;
    refresh: string;
    download: string;
    upload: string;
    required: string;
    optional: string;
    status: string;
    priority: string;
    type: string;
    date: string;
    time: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    description: string;
    actions: string;
  };
  complaints: {
    registerComplaint: string;
    complaintId: string;
    complaintType: string;
    complaintStatus: string;
    complaintPriority: string;
    submittedBy: string;
    assignedTo: string;
    submittedOn: string;
    resolvedOn: string;
    deadline: string;
    location: string;
    ward: string;
    area: string;
    landmark: string;
    contactInfo: string;
    mobile: string;
    files: string;
    remarks: string;
    feedback: string;
    rating: string;
    comment: string;
    slaStatus: string;
    timeElapsed: string;
    escalationLevel: string;
    types: {
      Water_Supply: string;
      Electricity: string;
      Road_Repair: string;
      Garbage_Collection: string;
      Street_Lighting: string;
      Sewerage: string;
      Public_Health: string;
      Traffic: string;
      Others: string;
    };
    statuses: {
      registered: string;
      assigned: string;
      in_progress: string;
      resolved: string;
      closed: string;
      reopened: string;
    };
    priorities: {
      low: string;
      medium: string;
      high: string;
      critical: string;
    };
    slaStatuses: {
      ontime: string;
      warning: string;
      overdue: string;
      completed: string;
    };
  };
  auth: {
    signUp: string;
    login: string;
    register: string;
    logout: string;
    email: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    resetPassword: string;
    profile: string;
    updateProfile: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    ward: string;
    department: string;
    language: string;
    notifications: string;
    emailAlerts: string;
    avatar: string;
    lastLogin: string;
    joinedOn: string;
    accountStatus: string;
    active: string;
    inactive: string;
    roles: {
      citizen: string;
      admin: string;
      ward_officer: string;
      maintenance: string;
    };
  };
  guest: {
    guestSubmission: string;
    registeredUser: string;
    emailVerification: string;
    otpSent: string;
    otpVerification: string;
    verifyAndSubmit: string;
    sendOtpAndSubmit: string;
    trackComplaint: string;
    guestSubmissionProcess: string;
    guestSubmissionDescription: string;
    welcomeBack: string;
    loginRequired: string;
    loginRequiredDescription: string;
    enterOtp: string;
    resendOtp: string;
    otpExpires: string;
    otpInstructions: string;
    checkEmail: string;
    recentComplaints: string;
    complaintDetails: string;
    nextSteps: string;
    supportContact: string;
  };
  forms: {
    contactInformation: string;
    problemDetails: string;
    locationDetails: string;
    complaintDescription: string;
    optionalUploads: string;
    captchaVerification: string;
    enterCaptcha: string;
    resetForm: string;
    submitComplaint: string;
    complaintSubmitted: string;
    complaintSubmissionError: string;
    fileUploadError: string;
    invalidCaptcha: string;
    requiredField: string;
    invalidEmail: string;
    invalidPhone: string;
    minCharacters: string;
  };
  dashboard: {
    overview: string;
    statistics: string;
    recentComplaints: string;
    pendingTasks: string;
    slaCompliance: string;
    performanceMetrics: string;
    quickActions: string;
    notifications: string;
    alerts: string;
    reports: string;
    analytics: string;
    trends: string;
    insights: string;
  };
  reports: {
    complaintReports: string;
    performanceReports: string;
    slaReports: string;
    userReports: string;
    wardReports: string;
    typeReports: string;
    statusReports: string;
    dateRange: string;
    from: string;
    to: string;
    generate: string;
    export: string;
    print: string;
    chart: string;
    table: string;
    summary: string;
    details: string;
  };
  messages: {
    complaintRegistered: string;
    complaintUpdated: string;
    complaintResolved: string;
    profileUpdated: string;
    passwordChanged: string;
    loginSuccessful: string;
    logoutSuccessful: string;
    registrationSuccessful: string;
    emailSent: string;
    fileUploaded: string;
    feedbackSubmitted: string;
    assignmentCompleted: string;
    statusUpdated: string;
    errorOccurred: string;
    networkError: string;
    unauthorizedAccess: string;
    sessionExpired: string;
    validationError: string;
    serverError: string;
  };
}

// Translations
const englishTranslation = mergeWithFallback(en, en) as Translation;

const toTranslation = (resource: unknown): Translation =>
  mergeWithFallback(resource, englishTranslation) as Translation;

const translations: Record<Language, Translation> = {
  en: englishTranslation,
  hi: toTranslation(hi),
  ml: toTranslation(ml),
};

// Language state interface
export interface LanguageState {
  currentLanguage: Language;
  translations: Translation;
  isLoading: boolean;
}

// Initial state
const initialState: LanguageState = {
  currentLanguage: (localStorage.getItem("language") as Language) || "en",
  translations: translations.en,
  isLoading: false,
};

// Language slice
const languageSlice = createSlice({
  name: "language",
  initialState: {
    ...initialState,
    translations: translations[initialState.currentLanguage],
  },
  reducers: {
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.currentLanguage = action.payload;
      state.translations = translations[action.payload];
      localStorage.setItem("language", action.payload);
    },
    initializeLanguage: (state) => {
      // Initialize language from localStorage or default to English
      const savedLanguage = localStorage.getItem("language") as Language | null;
      if (savedLanguage && translations[savedLanguage]) {
        state.currentLanguage = savedLanguage;
        state.translations = translations[savedLanguage];
      } else {
        state.currentLanguage = "en";
        state.translations = translations.en;
      }
    },
    resetLanguage: (state) => {
      state.currentLanguage = "en";
      state.translations = translations.en;
      localStorage.removeItem("language");
    },
  },
});

export const { setLanguage, initializeLanguage, resetLanguage } =
  languageSlice.actions;
export default languageSlice.reducer;

// Selectors
export const selectLanguage = (state: { language: LanguageState }) =>
  state.language.currentLanguage;
export const selectTranslations = (state: { language: LanguageState }) =>
  state.language.translations;
export const selectLanguageLoading = (state: { language: LanguageState }) =>
  state.language.isLoading;

// Export translations for direct use
export { translations };

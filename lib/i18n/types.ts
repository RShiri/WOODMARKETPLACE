export type Locale = 'en' | 'he'

export const LOCALES: Locale[] = ['en', 'he']
export const DEFAULT_LOCALE: Locale = 'en'

export function isRtl(locale: Locale): boolean {
  return locale === 'he'
}

interface BaseTypeCopy {
  label: string
  description: string
}

/**
 * Every UI string in the app, keyed by page/section. en.ts and he.ts both
 * implement this interface, so TypeScript itself catches a missing
 * translation (a locale file that doesn't satisfy `Dictionary` fails to
 * compile) rather than silently falling back to English at runtime.
 */
export interface Dictionary {
  nav: {
    calculator: string
    gallery: string
    login: string
    getPrice: string
    myOrders: string
    logOut: string
    admin: string
  }
  footer: {
    tagline: string
    calculator: string
    gallery: string
    home: string
    rights: string // "{year}" placeholder
  }
  landing: {
    badge: string
    heroTitle: string
    heroSubtitle: string
    ctaBuild: string
    ctaGallery: string
    featuresTitle: string
    featuresSubtitle: string
    feature1Title: string
    feature1Desc: string
    feature2Title: string
    feature2Desc: string
    feature3Title: string
    feature3Desc: string
    setCtaTitle: string
    setCtaSubtitle: string
    setCtaButton: string
  }
  calculator: {
    pageTitle: string
    pageSubtitle: string
    tabDimensions: string
    tabSet: string
    dimensionsLabel: string
    lengthLabel: string
    widthLabel: string
    heightLabel: string
    measureHint: string
    dimPlaceholderCm: string
    dimPlaceholderMm: string
    setIdLabel: string
    setIdPlaceholder: string
    lookUpButton: string
    lookingUpButton: string
    piecesLabel: string // "{count}" placeholder
    filledBelowHint: string
    confidenceExact: string
    confidenceEstimated: string
    estimatedToast: string
    baseLabel: string
    priceLabel: string
    enterDimensionsPrompt: string
    updatingSuffix: string
    howCalculated: string
    orderButton: string
    preparingCheckout: string
    thicknessAndBase: string // "{thickness}" and "{base}" placeholders
    previewHint: string
    previewPlaceholderNote: string
  }
  baseTypes: {
    none: BaseTypeCopy
    acrylic_clear: BaseTypeCopy
    acrylic_black: BaseTypeCopy
    led: BaseTypeCopy
  }
  breakdown: {
    hoodMaterial: string
    baseMaterial: string
    ledComponent: string
    cutting: string
    assembly: string
    margin: string
    total: string
  }
  gallery: {
    pageTitle: string
    pageSubtitle: string
    empty: string
  }
  cart: {
    title: string
    empty: string
    emptySubtitle: string
    goToCalculator: string
    quoteNotFound: string
    getNewPrice: string
    expiredMessage: string
    boxLabel: string // "{l}", "{w}", "{h}", "{unit}" placeholders
    dimsAndBase: string // "{thickness}" and "{base}" placeholders
    quantityLabel: string
    totalLabel: string
    proceedButton: string
    remove: string
    itemUnavailable: string
  }
  checkout: {
    title: string
    noQuoteTitle: string
    noQuoteSubtitle: string
    goToCalculator: string
    quoteNotFoundTitle: string
    quoteNotFoundSubtitle: string
    expiredTitle: string
    expiredSubtitle: string
    getNewPrice: string
    orderSummary: string
    dimsAndBase: string // "{thickness}" and "{base}" placeholders
    qtyLabel: string // "{qty}" placeholder
    totalLabel: string
    contactDetails: string
    fullName: string
    email: string
    phoneOptional: string
    shippingAddress: string
    recipientName: string
    addressLine1: string
    addressLine2Optional: string
    city: string
    state: string
    postalCode: string
    country: string
    placeOrder: string
    placingOrder: string
  }
  confirmation: {
    orderNotFoundTitle: string
    backToCalculator: string
    title: string
    thanksMessage: string // "{name}" and "{email}" placeholders
    orderIdLabel: string
    total: string
    buildAnother: string
  }
  account: {
    title: string
    noOrders: string
    buildBox: string
  }
  auth: {
    loginTitle: string
    loginSubtitle: string
    noAccount: string
    signUp: string
    email: string
    password: string
    logIn: string
    loggingIn: string
    registerTitle: string
    registerSubtitle: string
    haveAccount: string
    fullName: string
    createAccount: string
    creatingAccount: string
    forgotPassword: string
    forgotPasswordTitle: string
    forgotPasswordSubtitle: string
    resetEmailSentMessage: string
    sendResetLink: string
    sendingResetLink: string
    backToLogin: string
    resetPasswordTitle: string
    resetPasswordSubtitle: string
    newPassword: string
    confirmPassword: string
    updatePassword: string
    updatingPassword: string
  }
  admin: {
    ordersTitle: string
    noOrders: string
    customer: string
    shippingAddress: string
    items: string
    statusUpdated: string
    statusUpdateFailed: string
    statusPending: string
    statusPaid: string
    statusFulfilled: string
    statusCancelled: string
    statusRefunded: string
  }
  waSim: {
    title: string
    subtitle: string
    phoneLabel: string
    load: string
    loading: string
    empty: string
    placeholder: string
    send: string
    sending: string
  }
  common: {
    cm: string
    mm: string
    languageSwitcherLabel: string
  }
  bot: {
    greeting: string
    help: string
    foundSet: string // "{set}" placeholder
    suggestedSize: string // "{dims}" placeholder
    estimatedNote: string
    confirmPrompt: string
    repromptConfirm: string
    chooseBasePrefix: string // "{dims}" placeholder
    chooseBaseSuffix: string
    repromptBase: string
    editAfterDecline: string
    quotedPrice: string // "{price}" placeholder
    quotedLinkIntro: string
    quotedFooter: string
    lookupFailed: string // "{setId}" placeholder
    rateLimited: string
  }
}

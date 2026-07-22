import { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, uploadString } from "firebase/storage";

import { db, storage } from "@/firebase";
import { BusinessProfile } from "@/services/business-profile";
import { BrandColors } from "@/theme/tokens";

export type VisitingCardStatus = "draft" | "final";
export type VisitingCardOrientation = "horizontal" | "vertical";
export type VisitingCardSize = "us_standard" | "metric_standard";
export type VisitingCardQrType = "vcard" | "website" | "whatsapp" | "phone" | "email" | "maps" | "custom";
export type VisitingCardTemplateId =
  | "classic_professional"
  | "modern_minimal"
  | "orange_accent"
  | "vertical_professional"
  | "logo_focus"
  | "photo_profile"
  | "dark_premium"
  | "clean_corporate";

export type VisitingCardTemplate = {
  templateId: VisitingCardTemplateId;
  templateName: string;
  orientation: VisitingCardOrientation;
  frontEnabled: boolean;
  backEnabled: boolean;
  supportedElements: string[];
  defaultColors: VisitingCardDesignSettings;
  previewThumbnail: string;
};

export type VisitingCardDesignSettings = {
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  secondaryTextColor: string;
  headingFont: "Inter" | "System" | "Georgia";
  bodyFont: "Inter" | "System" | "Georgia";
  nameSize: number;
  jobTitleSize: number;
  contactSize: number;
  textAlign: "left" | "center" | "right";
  logoSize: number;
  photoSize: number;
  qrSize: number;
  showSafeArea: boolean;
  showBleed: boolean;
};

export type VisitingCardSocialLinks = {
  whatsapp: string;
  linkedIn: string;
  instagram: string;
  facebook: string;
  x: string;
  youtube: string;
  custom: string;
};

export type VisitingCardRecord = {
  id?: string;
  userId?: string;
  businessId?: string;
  cardNumber: string;
  numberingSequence: number;
  templateId: VisitingCardTemplateId;
  templateName: string;
  cardSize: VisitingCardSize;
  orientation: VisitingCardOrientation;
  status: VisitingCardStatus;
  frontEnabled: boolean;
  backEnabled: boolean;
  useBusinessProfileDetails: boolean;
  fullName: string;
  jobTitle: string;
  department: string;
  mobileNumber: string;
  alternatePhone: string;
  email: string;
  website: string;
  address: string;
  businessName: string;
  companyTagline: string;
  professionalLine: string;
  socialLinks: VisitingCardSocialLinks;
  logoUrl?: string | null;
  logoStoragePath?: string | null;
  profilePhotoUrl?: string | null;
  profilePhotoStoragePath?: string | null;
  iconOnlyMode: boolean;
  showTaxId: boolean;
  taxId: string;
  qrEnabled: boolean;
  qrType: VisitingCardQrType;
  qrPayload: string;
  qrIncludeFields: {
    phone: boolean;
    email: boolean;
    website: boolean;
    address: boolean;
    company: boolean;
    social: boolean;
  };
  designSettings: VisitingCardDesignSettings;
  customMessage: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  version: number;
  businessProfileSnapshot?: Partial<BusinessProfile> | null;
};

export type VisitingCardAssetInput = {
  uri?: string | null;
  base64?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
};

export type VisitingCardSaveResult = {
  card: VisitingCardRecord;
  source: "firebase" | "local-fallback";
  warning?: string;
  verifiedFirestorePath?: string;
};

const LOCAL_VISITING_CARD_KEY_PREFIX = "branddocs.visitingCards";
const FIREBASE_OPERATION_TIMEOUT_MS = 30000;

export const VISITING_CARD_TEMPLATES: VisitingCardTemplate[] = [
  {
    templateId: "classic_professional",
    templateName: "Classic Professional",
    orientation: "horizontal",
    frontEnabled: true,
    backEnabled: true,
    supportedElements: ["logo", "name", "title", "business", "tagline", "contact", "qr"],
    defaultColors: makeDesignDefaults("#FFFFFF", BrandColors.primary, BrandColors.text, BrandColors.textSecondary),
    previewThumbnail: "Classic white card with precise orange rule.",
  },
  {
    templateId: "modern_minimal",
    templateName: "Modern Minimal",
    orientation: "horizontal",
    frontEnabled: true,
    backEnabled: true,
    supportedElements: ["name", "title", "business", "contact", "social"],
    defaultColors: makeDesignDefaults("#FFFFFF", "#232323", "#232323", "#6F7378"),
    previewThumbnail: "Minimal monochrome card with spacious layout.",
  },
  {
    templateId: "orange_accent",
    templateName: "Orange Accent",
    orientation: "horizontal",
    frontEnabled: true,
    backEnabled: true,
    supportedElements: ["logo", "name", "title", "business", "tagline", "contact", "qr", "social"],
    defaultColors: makeDesignDefaults("#FFF8F1", BrandColors.primary, "#242424", "#6F7378"),
    previewThumbnail: "Warm orange accent band and white content field.",
  },
  {
    templateId: "vertical_professional",
    templateName: "Vertical Professional",
    orientation: "vertical",
    frontEnabled: true,
    backEnabled: true,
    supportedElements: ["logo", "name", "title", "business", "contact", "qr"],
    defaultColors: makeDesignDefaults("#FFFFFF", "#0F766E", "#232323", "#6F7378"),
    previewThumbnail: "Vertical print-safe layout with centered identity.",
  },
  {
    templateId: "logo_focus",
    templateName: "Logo Focus",
    orientation: "horizontal",
    frontEnabled: true,
    backEnabled: true,
    supportedElements: ["logo", "business", "tagline", "contact", "qr"],
    defaultColors: makeDesignDefaults("#FFFFFF", "#FF7A00", "#232323", "#6F7378"),
    previewThumbnail: "Large logo area with compact personal details.",
  },
  {
    templateId: "photo_profile",
    templateName: "Photo Profile",
    orientation: "horizontal",
    frontEnabled: true,
    backEnabled: true,
    supportedElements: ["photo", "name", "title", "business", "contact", "social", "qr"],
    defaultColors: makeDesignDefaults("#FFFFFF", "#2563EB", "#232323", "#6F7378"),
    previewThumbnail: "Profile-photo layout with structured contact back.",
  },
  {
    templateId: "dark_premium",
    templateName: "Dark Premium",
    orientation: "horizontal",
    frontEnabled: true,
    backEnabled: true,
    supportedElements: ["logo", "name", "title", "business", "tagline", "qr"],
    defaultColors: makeDesignDefaults("#232323", "#FFB86B", "#FFFFFF", "#E8EAED"),
    previewThumbnail: "Dark card with warm premium accent.",
  },
  {
    templateId: "clean_corporate",
    templateName: "Clean Corporate",
    orientation: "horizontal",
    frontEnabled: true,
    backEnabled: true,
    supportedElements: ["logo", "name", "title", "business", "contact", "qr", "social"],
    defaultColors: makeDesignDefaults("#FFFFFF", "#64748B", "#232323", "#6F7378"),
    previewThumbnail: "Corporate grid with restrained gray accent.",
  },
];

function makeDesignDefaults(
  backgroundColor: string,
  accentColor: string,
  textColor: string,
  secondaryTextColor: string
): VisitingCardDesignSettings {
  return {
    backgroundColor,
    accentColor,
    textColor,
    secondaryTextColor,
    headingFont: "Inter",
    bodyFont: "System",
    nameSize: 18,
    jobTitleSize: 10,
    contactSize: 8,
    textAlign: "left",
    logoSize: 48,
    photoSize: 46,
    qrSize: 46,
    showSafeArea: true,
    showBleed: false,
  };
}

function getLocalStorage() {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  return globalThis.localStorage;
}

function getLocalKey(userId?: string, businessId?: string) {
  return `${LOCAL_VISITING_CARD_KEY_PREFIX}.${userId || "guest"}.${businessId || "no-business"}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown): VisitingCardStatus {
  return String(value || "draft").toLowerCase() === "final" ? "final" : "draft";
}

export function getVisitingCardTemplate(templateId?: string) {
  return VISITING_CARD_TEMPLATES.find((template) => template.templateId === templateId) || VISITING_CARD_TEMPLATES[0];
}

function getSequenceFromCardNumber(cardNumber: string, year: string) {
  const match = cardNumber.match(/^VC-(\d{4})-(\d{4})$/);
  if (!match || match[1] !== year) return 0;
  return Number(match[2] || 0);
}

export function generateNextVisitingCardNumber(cards: VisitingCardRecord[], date = new Date()) {
  const year = String(date.getFullYear());
  const maxSequence = cards.reduce((currentMax, card) => {
    const savedSequence = String(card.cardNumber).includes(`VC-${year}-`) ? Number(card.numberingSequence || 0) : 0;
    return Math.max(currentMax, savedSequence, getSequenceFromCardNumber(card.cardNumber, year));
  }, 0);
  const nextSequence = maxSequence + 1;

  return {
    cardNumber: `VC-${year}-${String(nextSequence).padStart(4, "0")}`,
    numberingSequence: nextSequence,
  };
}

function defaultSocialLinks(): VisitingCardSocialLinks {
  return {
    whatsapp: "",
    linkedIn: "",
    instagram: "",
    facebook: "",
    x: "",
    youtube: "",
    custom: "",
  };
}

function normalizeDesignSettings(value: any, template: VisitingCardTemplate): VisitingCardDesignSettings {
  return {
    ...template.defaultColors,
    ...value,
    nameSize: clampNumber(value?.nameSize, 13, 26, template.defaultColors.nameSize),
    jobTitleSize: clampNumber(value?.jobTitleSize, 8, 16, template.defaultColors.jobTitleSize),
    contactSize: clampNumber(value?.contactSize, 7, 12, template.defaultColors.contactSize),
    logoSize: clampNumber(value?.logoSize, 24, 80, template.defaultColors.logoSize),
    photoSize: clampNumber(value?.photoSize, 28, 80, template.defaultColors.photoSize),
    qrSize: clampNumber(value?.qrSize, 32, 72, template.defaultColors.qrSize),
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeCard(value: any): VisitingCardRecord | null {
  if (!value || typeof value !== "object") return null;

  const cardNumber = String(value.cardNumber || value.number || "");
  if (!cardNumber) return null;

  const template = getVisitingCardTemplate(value.templateId);
  const socialLinks = { ...defaultSocialLinks(), ...(value.socialLinks || {}) };

  return {
    ...value,
    cardNumber,
    numberingSequence: toNumber(value.numberingSequence),
    templateId: template.templateId,
    templateName: value.templateName || template.templateName,
    cardSize: value.cardSize === "metric_standard" ? "metric_standard" : "us_standard",
    orientation: value.orientation === "vertical" ? "vertical" : template.orientation,
    status: normalizeStatus(value.status),
    frontEnabled: value.frontEnabled !== false,
    backEnabled: value.backEnabled !== false,
    useBusinessProfileDetails: value.useBusinessProfileDetails !== false,
    fullName: value.fullName || "",
    jobTitle: value.jobTitle || "",
    department: value.department || "",
    mobileNumber: value.mobileNumber || value.phone || "",
    alternatePhone: value.alternatePhone || "",
    email: value.email || "",
    website: value.website || "",
    address: value.address || "",
    businessName: value.businessName || "",
    companyTagline: value.companyTagline || value.tagline || "",
    professionalLine: value.professionalLine || "",
    socialLinks,
    logoUrl: value.logoUrl || null,
    logoStoragePath: value.logoStoragePath || null,
    profilePhotoUrl: value.profilePhotoUrl || null,
    profilePhotoStoragePath: value.profilePhotoStoragePath || null,
    iconOnlyMode: Boolean(value.iconOnlyMode),
    showTaxId: Boolean(value.showTaxId),
    taxId: value.taxId || "",
    qrEnabled: value.qrEnabled !== false,
    qrType: normalizeQrType(value.qrType),
    qrPayload: value.qrPayload || "",
    qrIncludeFields: {
      phone: value.qrIncludeFields?.phone !== false,
      email: value.qrIncludeFields?.email !== false,
      website: value.qrIncludeFields?.website !== false,
      address: Boolean(value.qrIncludeFields?.address),
      company: value.qrIncludeFields?.company !== false,
      social: Boolean(value.qrIncludeFields?.social),
    },
    designSettings: normalizeDesignSettings(value.designSettings, template),
    customMessage: value.customMessage || "",
    deletedAt: value.deletedAt || null,
    version: toNumber(value.version) || 1,
  };
}

function normalizeQrType(value: unknown): VisitingCardQrType {
  if (value === "website" || value === "whatsapp" || value === "phone" || value === "email" || value === "maps" || value === "custom") return value;
  return "vcard";
}

function saveLocalCards(userId: string | undefined, businessId: string | undefined, cards: VisitingCardRecord[]) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(getLocalKey(userId, businessId), JSON.stringify(cards));
}

function loadLocalCards(userId?: string, businessId?: string) {
  const storage = getLocalStorage();
  if (!storage) return [];

  const rawCards = storage.getItem(getLocalKey(userId, businessId));
  if (!rawCards) return [];

  try {
    const parsed = JSON.parse(rawCards);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeCard)
      .filter((card): card is VisitingCardRecord => Boolean(card))
      .filter((card) => !card.deletedAt);
  } catch (error) {
    console.warn("BrandDocs local visiting cards could not be parsed.", error);
    return [];
  }
}

function sortCards(first: VisitingCardRecord, second: VisitingCardRecord) {
  const firstDate = first.updatedAt || first.createdAt || todayISO();
  const secondDate = second.updatedAt || second.createdAt || todayISO();
  const dateDifference = new Date(secondDate).getTime() - new Date(firstDate).getTime();
  if (dateDifference !== 0) return dateDifference;
  return second.cardNumber.localeCompare(first.cardNumber);
}

function isVisibleToUser(card: VisitingCardRecord, userId?: string) {
  return !card.userId || !userId || card.userId === userId;
}

function mergeCards(existing: VisitingCardRecord[], incoming: VisitingCardRecord[]) {
  const byKey = new Map<string, VisitingCardRecord>();
  [...existing, ...incoming].forEach((card) => {
    byKey.set(card.id || card.cardNumber, card);
  });
  return Array.from(byKey.values()).filter((card) => !card.deletedAt).sort(sortCards);
}

export function buildVisitingCardFromProfile(
  profile: BusinessProfile | null,
  cards: VisitingCardRecord[] = [],
  templateId: VisitingCardTemplateId = "classic_professional"
): VisitingCardRecord {
  const template = getVisitingCardTemplate(templateId);
  const { cardNumber, numberingSequence } = generateNextVisitingCardNumber(cards);
  const brandColor = profile?.branding?.primaryColor || template.defaultColors.accentColor;
  const taxId = profile?.taxRegistrationNumber || Object.values(profile?.taxFields || {})[0] || "";

  return {
    cardNumber,
    numberingSequence,
    templateId: template.templateId,
    templateName: template.templateName,
    cardSize: "us_standard",
    orientation: template.orientation,
    status: "draft",
    frontEnabled: true,
    backEnabled: template.backEnabled,
    useBusinessProfileDetails: true,
    fullName: profile?.ownerName || "",
    jobTitle: "",
    department: "",
    mobileNumber: profile?.phone || "",
    alternatePhone: "",
    email: profile?.email || "",
    website: profile?.website || "",
    address: [profile?.address, profile?.city, profile?.stateProvince, profile?.zipCode, profile?.country].filter(Boolean).join(", "),
    businessName: profile?.name || "",
    companyTagline: "",
    professionalLine: "",
    socialLinks: defaultSocialLinks(),
    logoUrl: profile?.branding?.logoUrl || null,
    logoStoragePath: profile?.branding?.logoStoragePath || null,
    profilePhotoUrl: profile?.branding?.photoUrl || null,
    profilePhotoStoragePath: profile?.branding?.photoStoragePath || null,
    iconOnlyMode: false,
    showTaxId: false,
    taxId,
    qrEnabled: true,
    qrType: "vcard",
    qrPayload: "",
    qrIncludeFields: {
      phone: true,
      email: true,
      website: true,
      address: false,
      company: true,
      social: false,
    },
    designSettings: {
      ...template.defaultColors,
      accentColor: brandColor,
    },
    customMessage: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    version: 1,
    businessProfileSnapshot: profile || null,
  };
}

export async function loadVisitingCards(user: User | null, profile: BusinessProfile | null, maxCount = 50): Promise<VisitingCardRecord[]> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId) {
    try {
      const cardQuery = query(collection(db, "visitingCards"), where("businessId", "==", businessId), where("deletedAt", "==", null));
      const cardSnap = await getDocs(cardQuery);
      const cards = cardSnap.docs
        .map((cardDoc) => normalizeCard({ id: cardDoc.id, ...cardDoc.data() }))
        .filter((card): card is VisitingCardRecord => Boolean(card))
        .filter((card) => isVisibleToUser(card, userId))
        .sort(sortCards)
        .slice(0, maxCount);

      saveLocalCards(userId, businessId, mergeCards(loadLocalCards(userId, businessId), cards));
      return cards;
    } catch (error) {
      console.warn("BrandDocs Firebase visiting card load failed; using local fallback if available.", error);
    }
  }

  return loadLocalCards(userId, businessId)
    .filter((card) => isVisibleToUser(card, userId))
    .sort(sortCards)
    .slice(0, maxCount);
}

export async function loadVisitingCardById(user: User | null, profile: BusinessProfile | null, cardId: string): Promise<VisitingCardRecord | null> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId && !cardId.startsWith("local-")) {
    try {
      const cardSnap = await getDoc(doc(db, "visitingCards", cardId));
      const card = cardSnap.exists() ? normalizeCard({ id: cardSnap.id, ...cardSnap.data() }) : null;
      if (card && card.businessId === businessId && isVisibleToUser(card, userId) && !card.deletedAt) return card;
      if (card && card.userId !== userId) throw new Error("Unauthorized visiting card access blocked for the current user.");
    } catch (error) {
      console.warn("BrandDocs Firebase visiting card load by id failed; using local fallback if available.", error);
    }
  }

  return loadLocalCards(userId, businessId).find((card) => card.id === cardId) || null;
}

export async function saveVisitingCard(
  user: User | null,
  profile: BusinessProfile | null,
  card: VisitingCardRecord,
  assets?: { profilePhoto?: VisitingCardAssetInput | null }
): Promise<VisitingCardSaveResult> {
  const businessId = profile?.id;
  const userId = user?.uid;
  const now = new Date().toISOString();
  const template = getVisitingCardTemplate(card.templateId);
  const cardPayload: VisitingCardRecord = {
    ...card,
    businessId,
    userId,
    templateId: template.templateId,
    templateName: template.templateName,
    orientation: card.orientation || template.orientation,
    status: normalizeStatus(card.status),
    qrPayload: buildQrPayload(card),
    createdAt: card.createdAt || now,
    updatedAt: now,
    deletedAt: card.deletedAt || null,
    version: Math.max(1, Number(card.version || 1)),
    businessProfileSnapshot: card.businessProfileSnapshot || profile || null,
  };

  const upsertLocal = (savedCard: VisitingCardRecord) => {
    const localCards = loadLocalCards(userId, businessId);
    saveLocalCards(userId, businessId, mergeCards(localCards.filter((current) => current.id !== savedCard.id), [savedCard]));
  };

  if (user && businessId) {
    const cardRef = cardPayload.id && !cardPayload.id.startsWith("local-")
      ? doc(db, "visitingCards", cardPayload.id)
      : doc(collection(db, "visitingCards"));

    try {
      const photoResult = await syncProfilePhotoWithStorage(user, businessId, cardRef.id, assets?.profilePhoto, card.profilePhotoUrl, card.profilePhotoStoragePath);
      const firestorePayload = {
        ...cardPayload,
        id: cardRef.id,
        profilePhotoUrl: photoResult.url,
        profilePhotoStoragePath: photoResult.storagePath,
        createdAt: card.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await withFirebaseTimeout(setDoc(cardRef, firestorePayload, { merge: true }), "Firestore visiting card write");

      const verifySnap = await withFirebaseTimeout(getDoc(cardRef), "Firestore visiting card verification read");
      if (!verifySnap.exists()) {
        throw new Error(`Firestore verification failed: visitingCards/${cardRef.id} was not created.`);
      }

      const verifiedCard = normalizeCard({ id: verifySnap.id, ...verifySnap.data() });
      if (!verifiedCard || verifiedCard.businessId !== businessId || verifiedCard.userId !== user.uid) {
        throw new Error(`Firestore verification failed: visitingCards/${cardRef.id} does not belong to the active user/business.`);
      }

      const savedCard = {
        ...cardPayload,
        id: cardRef.id,
        profilePhotoUrl: photoResult.url,
        profilePhotoStoragePath: photoResult.storagePath,
      };
      upsertLocal(savedCard);
      return { card: savedCard, source: "firebase", verifiedFirestorePath: `visitingCards/${cardRef.id}` };
    } catch (error: any) {
      console.error("BrandDocs Firebase visiting card save failed.", {
        code: error?.code,
        message: error?.message,
        businessId,
        cardId: cardRef.id,
      });

      if (assets?.profilePhoto?.uri) {
        throw new Error(error?.message || "Profile photo upload or visiting card save failed.");
      }

      const localCard = { ...cardPayload, id: cardPayload.id || `local-${Date.now()}` };
      upsertLocal(localCard);
      return {
        card: localCard,
        source: "local-fallback",
        warning: error?.message || "Firebase visiting card save failed. Card was saved locally on this device.",
      };
    }
  }

  const localCard = { ...cardPayload, id: cardPayload.id || `local-${Date.now()}` };
  upsertLocal(localCard);
  return {
    card: localCard,
    source: "local-fallback",
    warning: "No active Firebase user or business profile was available, so the visiting card was saved locally on this device.",
  };
}

export async function deleteVisitingCard(user: User | null, profile: BusinessProfile | null, card: VisitingCardRecord) {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId && card.id && !card.id.startsWith("local-")) {
    try {
      await setDoc(doc(db, "visitingCards", card.id), {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.warn("BrandDocs soft delete failed; attempting hard delete for visiting card.", error);
      await deleteDoc(doc(db, "visitingCards", card.id));
    }
  }

  const localCards = loadLocalCards(userId, businessId);
  saveLocalCards(userId, businessId, localCards.filter((current) => {
    return current.id !== card.id && current.cardNumber !== card.cardNumber;
  }));
}

export function duplicateVisitingCardRecord(card: VisitingCardRecord, cards: VisitingCardRecord[]) {
  const { cardNumber, numberingSequence } = generateNextVisitingCardNumber(cards);
  return {
    ...card,
    id: undefined,
    cardNumber,
    numberingSequence,
    status: "draft" as VisitingCardStatus,
    fullName: `${card.fullName || "Untitled"} Copy`.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
}

export function validateVisitingCard(card: VisitingCardRecord, requireFinal = false) {
  const errors: Record<string, string> = {};
  const fullName = card.fullName.trim();

  if (!fullName) errors.fullName = "Full name is required.";
  if (fullName.length > 70) errors.fullName = "Full name must be 70 characters or fewer.";
  if (card.jobTitle.length > 60) errors.jobTitle = "Job title must be 60 characters or fewer.";
  if (card.department.length > 60) errors.department = "Department must be 60 characters or fewer.";
  if (card.professionalLine.length > 120) errors.professionalLine = "Professional line must be 120 characters or fewer.";
  if (card.companyTagline.length > 90) errors.companyTagline = "Tagline must be 90 characters or fewer.";
  if (card.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(card.email)) errors.email = "Enter a valid email address.";
  if (card.mobileNumber && !isPhoneLike(card.mobileNumber)) errors.mobileNumber = "Enter a valid phone number.";
  if (card.alternatePhone && !isPhoneLike(card.alternatePhone)) errors.alternatePhone = "Enter a valid alternate phone number.";
  if (card.website && !isUrlLike(card.website)) errors.website = "Enter a valid website URL.";

  Object.entries(card.socialLinks).forEach(([key, value]) => {
    if (value && !isUrlLike(value) && key !== "whatsapp") {
      errors[`social.${key}`] = "Enter a valid social URL.";
    }
  });

  if (card.qrEnabled) {
    const qrPayload = buildQrPayload(card);
    if (!qrPayload.trim()) errors.qrPayload = "QR data is empty. Add contact data or disable QR.";
    if (qrPayload.length > 900) errors.qrPayload = "QR data is too dense for a small printed visiting card.";
  }

  if (requireFinal && !card.backEnabled && !card.mobileNumber && !card.email && !card.website) {
    errors.final = "Add at least one contact method before saving as final.";
  }

  return errors;
}

export function buildQrPayload(card: VisitingCardRecord) {
  if (!card.qrEnabled) return "";
  if (card.qrType === "website") return normalizeUrl(card.website || card.qrPayload);
  if (card.qrType === "whatsapp") return card.socialLinks.whatsapp ? `https://wa.me/${card.socialLinks.whatsapp.replace(/[^\d]/g, "")}` : "";
  if (card.qrType === "phone") return card.mobileNumber ? `tel:${card.mobileNumber.replace(/\s/g, "")}` : "";
  if (card.qrType === "email") return card.email ? `mailto:${card.email}` : "";
  if (card.qrType === "maps") return card.address ? `https://maps.google.com/?q=${encodeURIComponent(card.address)}` : "";
  if (card.qrType === "custom") return card.qrPayload || "";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(card.fullName)}`,
    card.businessName && card.qrIncludeFields.company ? `ORG:${escapeVCard(card.businessName)}` : "",
    card.jobTitle ? `TITLE:${escapeVCard(card.jobTitle)}` : "",
    card.mobileNumber && card.qrIncludeFields.phone ? `TEL;TYPE=CELL:${escapeVCard(card.mobileNumber)}` : "",
    card.email && card.qrIncludeFields.email ? `EMAIL:${escapeVCard(card.email)}` : "",
    card.website && card.qrIncludeFields.website ? `URL:${normalizeUrl(card.website)}` : "",
    card.address && card.qrIncludeFields.address ? `ADR;TYPE=WORK:;;${escapeVCard(card.address)}` : "",
    "END:VCARD",
  ];

  return lines.filter(Boolean).join("\n");
}

export function getCardPhysicalSize(cardSize: VisitingCardSize, orientation: VisitingCardOrientation) {
  const size = cardSize === "metric_standard"
    ? { widthMm: 90, heightMm: 54, label: "90 x 54 mm" }
    : { widthMm: 88.9, heightMm: 50.8, label: "3.5 x 2 in" };

  if (orientation === "vertical") {
    return { widthMm: size.heightMm, heightMm: size.widthMm, label: size.label };
  }

  return size;
}

export function formatVisitingCardDate(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function sanitizeVisitingCardFilename(card: VisitingCardRecord) {
  const raw = `${card.businessName || "business"}_${card.fullName || "contact"}_visiting-card_${todayISO()}`;
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPhoneLike(value: string) {
  return /^[+()\-\s\d]{7,20}$/.test(value);
}

function isUrlLike(value: string) {
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[^\s]*)?$/i.test(value);
}

function normalizeUrl(value: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function escapeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

async function syncProfilePhotoWithStorage(
  user: User,
  businessId: string,
  cardId: string,
  asset: VisitingCardAssetInput | null | undefined,
  currentUrl?: string | null,
  currentStoragePath?: string | null
) {
  if (!asset?.uri) {
    return {
      url: currentUrl || null,
      storagePath: currentStoragePath || null,
    };
  }

  if (/^https?:\/\//i.test(asset.uri)) {
    return {
      url: asset.uri,
      storagePath: currentStoragePath || null,
    };
  }

  const mimeType = inferMimeType(asset.uri, asset);
  const storagePath = currentStoragePath || `users/${user.uid}/businesses/${businessId}/visiting-cards/${cardId}/profile-photo.${getFileExtension(mimeType)}`;
  const assetRef = ref(storage, storagePath);

  try {
    const dataUriParts = getDataUriParts(asset.uri);
    const base64Payload = asset.base64 || dataUriParts?.base64;

    if (base64Payload) {
      await withFirebaseTimeout(uploadString(assetRef, base64Payload, "base64", { contentType: mimeType }), `Firebase Storage profile photo upload ${storagePath}`);
    } else {
      const response = await withFirebaseTimeout(fetch(asset.uri), `Reading selected profile photo ${storagePath}`);
      if (!response.ok) throw new Error(`Could not read selected profile photo. HTTP ${response.status} ${response.statusText}`.trim());
      const blob = await withFirebaseTimeout(response.blob(), `Preparing selected profile photo ${storagePath}`);
      await withFirebaseTimeout(uploadBytes(assetRef, blob, { contentType: mimeType }), `Firebase Storage profile photo upload ${storagePath}`);
    }

    const downloadUrl = await withFirebaseTimeout(getDownloadURL(assetRef), `Firebase Storage profile photo download URL ${storagePath}`);
    return { url: downloadUrl, storagePath };
  } catch (error: any) {
    console.error("BrandDocs profile photo upload failed.", { storagePath, code: error?.code, message: error?.message });
    throw new Error(`Profile photo upload failed at ${storagePath}: ${error?.message || String(error)}`);
  }
}

function inferMimeType(uri: string, asset?: VisitingCardAssetInput | null) {
  if (asset?.mimeType) return asset.mimeType;
  const candidate = asset?.fileName || uri;
  if (/\.png(\?|#|$)/i.test(candidate) || /^data:image\/png/i.test(candidate)) return "image/png";
  if (/\.webp(\?|#|$)/i.test(candidate) || /^data:image\/webp/i.test(candidate)) return "image/webp";
  if (/\.heic(\?|#|$)/i.test(candidate)) return "image/heic";
  if (/\.heif(\?|#|$)/i.test(candidate)) return "image/heif";
  return "image/jpeg";
}

function getFileExtension(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("heic")) return "heic";
  if (mimeType.includes("heif")) return "heif";
  return "jpg";
}

function getDataUriParts(uri?: string | null) {
  if (!uri) return null;
  const match = uri.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

async function withFirebaseTimeout<T>(operation: Promise<T>, label: string, timeoutMs = FIREBASE_OPERATION_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

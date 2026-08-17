import { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes, uploadString } from "firebase/storage";
import { Platform } from "react-native";

import { db, storage } from "@/firebase";
import { setDocumentTemplateColor } from "@/components/document-template/document-colors";
import { Colors } from "@/theme/colors";
import {
  normalizeTemplateColor,
  primaryColorToTemplateColor,
  setActiveTemplateColor,
  templateColorToPrimaryColor,
  TemplateColor,
} from "@/theme/template-colors";
import { processLogoAssetForUpload } from "@/utils/remove-logo-background";

export type BusinessProfile = {
  id?: string;
  templateColor?: TemplateColor;
  name: string;
  legalName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  website?: string;
  businessType?: string;
  country?: string;
  countryCode?: string;
  stateProvince?: string;
  city?: string;
  zipCode?: string;
  address?: string;
  defaultCurrency?: string;
  currencyCode?: string;
  taxRegistrationNumber?: string;
  taxFields?: Record<string, string>;
  countryMeta?: {
    countryCode?: string;
    currencyCode?: string;
    postalCode?: string;
    taxIdentifiers?: Record<string, string>;
    businessRegistrationIdentifiers?: Record<string, string>;
    bankDetails?: Record<string, string>;
    documentDefaults?: Record<string, string>;
  };
  branding?: {
    primaryColor?: string;
    logoUrl?: string | null;
    logoStoragePath?: string | null;
    stampUrl?: string | null;
    stampStoragePath?: string | null;
    signatureUrl?: string | null;
    signatureStoragePath?: string | null;
    photoUrl?: string | null;
    photoStoragePath?: string | null;
  };
};

export type BusinessProfileAssetState = {
  url?: string | null;
  storagePath?: string | null;
};

export type BusinessProfilePreviousAssets = {
  logo?: BusinessProfileAssetState;
  stamp?: BusinessProfileAssetState;
  signature?: BusinessProfileAssetState;
  photo?: BusinessProfileAssetState;
};

export type BusinessProfileAssetInput = {
  uri?: string | null;
  base64?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  file?: File | null;
  fileSize?: number | null;
};

export type BusinessProfileAssetInputs = {
  logo?: BusinessProfileAssetInput | null;
  stamp?: BusinessProfileAssetInput | null;
  signature?: BusinessProfileAssetInput | null;
  photo?: BusinessProfileAssetInput | null;
};

export type BusinessProfileAssetKind = "logo" | "stamp" | "signature" | "photo";

export type BusinessProfileAssetResult = {
  kind: BusinessProfileAssetKind;
  status: "uploaded" | "kept" | "removed" | "skipped" | "failed";
  userMessage: string;
  technicalReason?: string;
  url?: string | null;
  storagePath?: string | null;
};

export type BusinessProfileSaveResult = {
  profile: BusinessProfile;
  source: "firebase";
  assetWarnings?: string[];
  assetResults?: BusinessProfileAssetResult[];
};

const LOCAL_PROFILE_KEY_PREFIX = "branddocs.businessProfile";
const FIREBASE_OPERATION_TIMEOUT_MS = 30000;
export const BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED = true;
export const BUSINESS_PROFILE_IMAGE_UPLOADS_DISABLED_MESSAGE = "";

let memoryCachedProfile: BusinessProfile | null = null;

function applyTemplateColorPreference(value?: string | null) {
  const normalized = setActiveTemplateColor(value);
  setDocumentTemplateColor(normalized);
  return normalized;
}

function getLocalStorage() {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }

  return globalThis.localStorage;
}

function getLocalKey(userId?: string) {
  return `${LOCAL_PROFILE_KEY_PREFIX}.${userId || "guest"}`;
}

function getNormalizedTaxFields(value: any): Record<string, string> {
  if (!value || typeof value !== "object") return {};

  if (value.taxFields && typeof value.taxFields === "object") {
    return Object.entries(value.taxFields).reduce<Record<string, string>>((accumulator, [key, currentValue]) => {
      if (typeof currentValue === "string" && currentValue.trim()) {
        accumulator[key] = currentValue.trim();
      }
      return accumulator;
    }, {});
  }

  if (typeof value.taxRegistrationNumber === "string" && value.taxRegistrationNumber.trim()) {
    return { taxRegistrationNumber: value.taxRegistrationNumber.trim() };
  }

  return {};
}

function isRemoteAssetUri(uri?: string | null) {
  return !!uri && /^(https?:\/\/|gs:\/\/)/i.test(uri);
}

function getFirebaseErrorReason(error: unknown) {
  if (!error || typeof error !== "object") {
    return String(error || "Unknown error");
  }

  const firebaseError = error as { code?: string; message?: string; name?: string };
  const parts = [firebaseError.code, firebaseError.name, firebaseError.message].filter(Boolean);
  return parts.length ? parts.join(" - ") : JSON.stringify(error);
}

function logFirebaseFailure(scope: string, error: unknown) {
  console.error(`[BrandDocs] ${scope} failed: ${getFirebaseErrorReason(error)}`, error);
}

function withFirebaseTimeout<T>(operation: Promise<T>, label: string, timeoutMs: number = FIREBASE_OPERATION_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs / 1000} seconds. Check network connectivity, Firebase rules, and Storage CORS/configuration.`));
    }, timeoutMs);
  });

  return Promise.race([operation, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function getLocalAssetUri(asset: BusinessProfileAssetInput | null | undefined, fallbackUri?: string | null) {
  return asset?.uri ?? fallbackUri ?? null;
}

function getDataUriParts(uri: string) {
  const match = uri.match(/^data:([^;,]+)?;base64,(.*)$/);
  if (!match) return null;

  return {
    mimeType: match[1] || "image/jpeg",
    base64: match[2],
  };
}

function getFileExtension(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("heic")) return "heic";
  if (mimeType.includes("heif")) return "heif";
  return "jpg";
}

function inferMimeType(uri: string, asset?: BusinessProfileAssetInput | null) {
  if (asset?.mimeType) return asset.mimeType;

  const dataUriParts = getDataUriParts(uri);
  if (dataUriParts?.mimeType) return dataUriParts.mimeType;

  const candidate = asset?.fileName || uri;
  if (/\.png(\?|#|$)/i.test(candidate)) return "image/png";
  if (/\.webp(\?|#|$)/i.test(candidate)) return "image/webp";
  if (/\.heic(\?|#|$)/i.test(candidate)) return "image/heic";
  if (/\.heif(\?|#|$)/i.test(candidate)) return "image/heif";
  return "image/jpeg";
}

function getPersistedAssetUrl(uri?: string | null) {
  return isRemoteAssetUri(uri) ? uri : null;
}

function getAssetLabel(kind: BusinessProfileAssetKind) {
  if (kind === "logo") return "Logo";
  if (kind === "stamp") return "Company stamp";
  if (kind === "signature") return "Company signature";
  return "Profile photo";
}

function getAssetSuccessMessage(kind: BusinessProfileAssetKind) {
  return `${getAssetLabel(kind)} uploaded successfully.`;
}

function getAssetFailureMessage(kind: BusinessProfileAssetKind) {
  return `${getAssetLabel(kind)} upload failed. You can retry from Business Profile settings.`;
}

function getBase64ByteSize(base64: string) {
  const normalized = base64.replace(/\s/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, (normalized.length * 3) / 4 - padding);
}

function validateAssetForUpload(kind: BusinessProfileAssetKind, mimeType: string, sizeBytes?: number | null) {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
  if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
    throw new Error(`${getAssetLabel(kind)} must be a PNG, JPG, JPEG, WEBP, HEIC, or HEIF image.`);
  }

  if (sizeBytes && sizeBytes > 8 * 1024 * 1024) {
    throw new Error(`${getAssetLabel(kind)} is larger than 8 MB. Choose a smaller image.`);
  }
}

async function uploadWebAsset(file: File, storagePath: string, contentType: string) {
  const assetRef = ref(storage, storagePath);
  await withFirebaseTimeout(uploadBytes(assetRef, file, { contentType }), `Firebase Storage web upload ${storagePath}`, 3000);
  return getDownloadURL(assetRef);
}

async function uploadNativeAsset(kind: BusinessProfileAssetKind, uri: string, storagePath: string, contentType: string, base64Payload?: string | null) {
  const assetRef = ref(storage, storagePath);

  if (base64Payload) {
    await withFirebaseTimeout(uploadString(assetRef, base64Payload, "base64", { contentType }), `Firebase Storage native upload ${storagePath}`, 3000);
  } else {
    const blob = await withFirebaseTimeout(readUriAsBlob(uri, kind), `Preparing selected native image ${storagePath}`, 3000);
    await withFirebaseTimeout(uploadBytes(assetRef, blob, { contentType }), `Firebase Storage native upload ${storagePath}`, 3000);
  }

  return getDownloadURL(assetRef);
}

async function readUriAsBlob(uri: string, kind: BusinessProfileAssetKind) {
  if (Platform.OS === "web") {
    const response = await withFirebaseTimeout(fetch(uri), `Reading selected ${kind} image`);
    if (!response.ok) {
      throw new Error(`Could not read selected ${kind} image. HTTP ${response.status} ${response.statusText}`.trim());
    }
    return response.blob();
  }

  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error(`Could not read selected ${kind} image from the device URI.`));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

function readBlobAsDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function uploadAssetToStorage(
  user: User,
  businessId: string,
  kind: BusinessProfileAssetKind,
  asset: BusinessProfileAssetInput,
  existingPath?: string | null
) {
  let preparedAsset = asset;
  const uri = preparedAsset.uri;
  if (!uri) {
    return { url: null, storagePath: null };
  }

  if (isRemoteAssetUri(uri)) {
    return { url: uri, storagePath: existingPath || null };
  }

  if (kind === "logo" || kind === "photo") {
    preparedAsset = (await processLogoAssetForUpload(preparedAsset)) || preparedAsset;
  }

  const webFile = Platform.OS === "web" ? preparedAsset.file : null;
  const mimeType = webFile?.type || inferMimeType(preparedAsset.uri || uri, preparedAsset);
  const dataUriParts = getDataUriParts(preparedAsset.uri || uri);
  const base64Payload = preparedAsset.base64 || dataUriParts?.base64;
  const sizeBytes = webFile?.size || preparedAsset.fileSize || (base64Payload ? getBase64ByteSize(base64Payload) : null);
  validateAssetForUpload(kind, mimeType, sizeBytes);

  const storagePath =
    existingPath ||
    `users/${user.uid}/businesses/${businessId}/${kind}.${kind === "logo" ? "png" : getFileExtension(mimeType)}`;

  try {
    console.log("[BrandDocs] Starting optional asset upload.", {
      kind,
      platform: Platform.OS,
      storageBucket: storage.app.options.storageBucket,
      storagePath,
      hasAuthUser: !!user.uid,
      usesWebFile: !!webFile,
      fileName: webFile?.name || preparedAsset.fileName,
      contentType: mimeType,
      sizeBytes,
    });

    let downloadUrl: string;
    if (Platform.OS === "web") {
      if (!webFile) {
        throw new Error("The browser File object was not available for this web upload.");
      }
      downloadUrl = await withFirebaseTimeout(uploadWebAsset(webFile, storagePath, mimeType), `Firebase Storage ${kind} web upload`);
    } else {
      downloadUrl = await withFirebaseTimeout(
        uploadNativeAsset(kind, preparedAsset.uri || uri, storagePath, mimeType, base64Payload),
        `Firebase Storage ${kind} native upload`
      );
    }

    console.log("[BrandDocs] Optional asset upload completed.", { kind, storagePath });
    return { url: downloadUrl, storagePath };
  } catch (error: unknown) {
    console.warn(`[BrandDocs] Firebase Storage ${kind} upload failed, falling back to Base64 data URL:`, error);
    if (base64Payload) {
      return { url: `data:${mimeType};base64,${base64Payload}`, storagePath: null };
    }
    if (webFile) {
      try {
        const dataUri = await readBlobAsDataUri(webFile);
        return { url: dataUri, storagePath: null };
      } catch (readError) {
        console.error("[BrandDocs] Failed to read web file as data URI:", readError);
      }
    }
  }
}

async function resolveAssetAfterProfileSave(
  user: User,
  businessId: string,
  kind: BusinessProfileAssetKind,
  asset: BusinessProfileAssetInput | null | undefined,
  currentUri: string | null | undefined,
  previousAsset?: BusinessProfileAssetState
): Promise<BusinessProfileAssetResult> {
  const assetUri = getLocalAssetUri(asset, currentUri);

  if (!assetUri) {
    if (previousAsset?.url || previousAsset?.storagePath) {
      return {
        kind,
        status: "removed",
        userMessage: `${getAssetLabel(kind)} removed from this business profile.`,
        url: null,
        storagePath: null,
      };
    }

    return {
      kind,
      status: "skipped",
      userMessage: `${getAssetLabel(kind)} was not selected.`,
      url: null,
      storagePath: null,
    };
  }

  if (isRemoteAssetUri(assetUri)) {
    return {
      kind,
      status: "kept",
      userMessage: `${getAssetLabel(kind)} was kept.`,
      url: assetUri,
      storagePath: previousAsset?.storagePath || null,
    };
  }

  try {
    const result = await uploadAssetToStorage(user, businessId, kind, { ...asset, uri: assetUri }, previousAsset?.storagePath);
    return {
      kind,
      status: "uploaded",
      userMessage: getAssetSuccessMessage(kind),
      url: result.url,
      storagePath: result.storagePath,
    };
  } catch (error: unknown) {
    const technicalReason = getFirebaseErrorReason(error);
    logFirebaseFailure(`Optional ${kind} asset`, error);
    return {
      kind,
      status: "failed",
      userMessage: getAssetFailureMessage(kind),
      technicalReason,
      url: previousAsset?.url ?? null,
      storagePath: previousAsset?.storagePath ?? null,
    };
  }
}

async function deleteAssetFromStorage(storagePath?: string | null) {
  if (!storagePath) return;

  try {
    await withFirebaseTimeout(deleteObject(ref(storage, storagePath)), `Firebase Storage delete ${storagePath}`);
  } catch (error) {
    logFirebaseFailure(`Firebase Storage asset deletion at ${storagePath}`, error);
  }
}

function normalizeProfile(id: string | undefined, value: any): BusinessProfile | null {
  if (!value || typeof value !== "object") return null;

  const name = String(value.name || value.legalName || "").trim();
  if (!name) return null;

  const taxFields = getNormalizedTaxFields(value);
  const primaryTaxValue = Object.values(taxFields)[0] || value.taxRegistrationNumber || "";

  const countryMeta = value.countryMeta || {};
  const templateColor = normalizeTemplateColor(
    value.templateColor || primaryColorToTemplateColor(value.branding?.primaryColor),
  );
  const resolvedPrimary = templateColorToPrimaryColor(templateColor);

  return {
    id,
    templateColor,
    name,
    legalName: value.legalName || name,
    ownerName: value.ownerName || "",
    email: value.email || "",
    phone: value.phone || "",
    website: value.website || "",
    businessType: value.businessType || "",
    country: value.country || "",
    countryCode: value.countryCode || countryMeta.countryCode || "",
    stateProvince: value.stateProvince || "",
    city: value.city || "",
    zipCode: value.zipCode || "",
    address: value.address || "",
    defaultCurrency: value.defaultCurrency || value.currencyCode || "",
    currencyCode: value.currencyCode || value.defaultCurrency || "",
    taxRegistrationNumber: typeof primaryTaxValue === "string" ? primaryTaxValue.trim() : "",
    taxFields,
    countryMeta: {
      countryCode: value.countryCode || countryMeta.countryCode || "",
      currencyCode: value.currencyCode || value.defaultCurrency || countryMeta.currencyCode || "",
      postalCode: value.zipCode || countryMeta.postalCode || "",
      taxIdentifiers: taxFields,
      businessRegistrationIdentifiers: countryMeta.businessRegistrationIdentifiers || {},
      bankDetails: countryMeta.bankDetails || {},
      documentDefaults: countryMeta.documentDefaults || {},
    },
    branding: {
      primaryColor: value.branding?.primaryColor || resolvedPrimary || Colors.primary,
      logoUrl: value.branding?.logoUrl || null,
      logoStoragePath: value.branding?.logoStoragePath || null,
      stampUrl: value.branding?.stampUrl || null,
      stampStoragePath: value.branding?.stampStoragePath || null,
      signatureUrl: value.branding?.signatureUrl || null,
      signatureStoragePath: value.branding?.signatureStoragePath || null,
      photoUrl: value.branding?.photoUrl || null,
      photoStoragePath: value.branding?.photoStoragePath || null,
    },
  };
}

function saveLocalProfile(userId: string | undefined, profile: BusinessProfile) {
  const storage = getLocalStorage();
  memoryCachedProfile = profile;
  applyTemplateColorPreference(profile.templateColor || primaryColorToTemplateColor(profile.branding?.primaryColor));
  if (!storage) return;

  storage.setItem(getLocalKey(userId), JSON.stringify(profile));
}

function loadLocalProfile(userId?: string) {
  const storage = getLocalStorage();
  if (!storage) return null;

  const rawProfile = storage.getItem(getLocalKey(userId));
  if (!rawProfile) return null;

  try {
    return normalizeProfile(undefined, JSON.parse(rawProfile));
  } catch (error) {
    console.warn("BrandDocs local business profile could not be parsed.", error);
    return null;
  }
}

export function getCachedBusinessProfile(userId?: string): BusinessProfile | null {
  if (memoryCachedProfile) {
    applyTemplateColorPreference(memoryCachedProfile.templateColor || primaryColorToTemplateColor(memoryCachedProfile.branding?.primaryColor));
    return memoryCachedProfile;
  }
  const local = loadLocalProfile(userId);
  if (local) {
    memoryCachedProfile = local;
    applyTemplateColorPreference(local.templateColor || primaryColorToTemplateColor(local.branding?.primaryColor));
  }
  return memoryCachedProfile;
}

export function getCompanyInitials(companyName?: string) {
  const words = (companyName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "BD";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

export async function loadBusinessProfile(user: User | null): Promise<BusinessProfile | null> {
  if (!user) {
    const local = loadLocalProfile();
    memoryCachedProfile = local;
    if (local?.templateColor) {
      applyTemplateColorPreference(local.templateColor);
    }
    return local;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userTemplateColor = userSnap.exists() ? normalizeTemplateColor(userSnap.data().templateColor) : "orange";
    const activeBusinessId = userSnap.exists() ? userSnap.data().activeBusinessId : undefined;

    if (activeBusinessId) {
      const businessSnap = await getDoc(doc(db, "businesses", activeBusinessId));
      const profile = businessSnap.exists() ? normalizeProfile(businessSnap.id, businessSnap.data()) : null;

      if (profile) {
        profile.templateColor = normalizeTemplateColor(profile.templateColor || userTemplateColor);
        profile.branding = {
          ...profile.branding,
          primaryColor: templateColorToPrimaryColor(profile.templateColor),
        };
        saveLocalProfile(user.uid, profile);
        memoryCachedProfile = profile;
        applyTemplateColorPreference(profile.templateColor);
        return profile;
      }
    }

    applyTemplateColorPreference(userTemplateColor);
  } catch (error) {
    console.warn("BrandDocs Firebase profile load failed; using local fallback if available.", error);
  }

  const local = loadLocalProfile(user.uid);
  if (local) {
    memoryCachedProfile = local;
    if (local.templateColor) {
      applyTemplateColorPreference(local.templateColor);
    }
  }
  return local;
}

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanUndefined);
  if (typeof obj === "object") {
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
      return obj;
    }
    const cleaned: any = {};
    for (const key in obj) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      } else {
        cleaned[key] = null;
      }
    }
    return cleaned;
  }
  return obj;
}

export async function saveBusinessProfile(
  user: User,
  profile: BusinessProfile,
  previousAssets?: BusinessProfilePreviousAssets,
  currentAssets?: BusinessProfileAssetInputs
): Promise<BusinessProfileSaveResult> {
  if (!user?.uid) {
    throw new Error("Firebase Authentication did not return a current user. Please sign in again.");
  }

  console.log(`[BrandDocs] Starting business profile save for user ${user.uid}.`);

  let persistedTemplateColor: string | null = null;
  try {
    const userPreferenceSnap = await getDoc(doc(db, "users", user.uid));
    persistedTemplateColor = userPreferenceSnap.exists() ? userPreferenceSnap.data().templateColor || null : null;
  } catch (error) {
    console.warn("BrandDocs user template color read failed; using incoming profile values.", error);
  }

  const templateColor = normalizeTemplateColor(
    profile.templateColor || persistedTemplateColor || primaryColorToTemplateColor(profile.branding?.primaryColor),
  );
  const resolvedPrimaryColor = templateColorToPrimaryColor(templateColor);
  applyTemplateColorPreference(templateColor);

  const profilePayload = {
    templateColor,
    name: profile.name.trim(),
    legalName: (profile.legalName || profile.name).trim(),
    ownerName: profile.ownerName?.trim() || "",
    email: profile.email?.trim() || user.email || "",
    phone: profile.phone?.trim() || "",
    website: profile.website?.trim() || "",
    businessType: profile.businessType?.trim() || "",
    country: profile.country?.trim() || "",
    countryCode: (profile.countryCode || profile.countryMeta?.countryCode || "").trim().toUpperCase(),
    stateProvince: profile.stateProvince?.trim() || "",
    city: profile.city?.trim() || "",
    zipCode: profile.zipCode?.trim() || "",
    address: profile.address?.trim() || "",
    defaultCurrency: (profile.defaultCurrency || profile.currencyCode || "USD").trim().toUpperCase(),
    currencyCode: (profile.currencyCode || profile.defaultCurrency || "USD").trim().toUpperCase(),
    taxRegistrationNumber: profile.taxRegistrationNumber?.trim() || "",
    taxFields: profile.taxFields || {},
    countryMeta: {
      countryCode: (profile.countryCode || profile.countryMeta?.countryCode || "").trim().toUpperCase(),
      currencyCode: (profile.currencyCode || profile.defaultCurrency || "USD").trim().toUpperCase(),
      postalCode: profile.zipCode?.trim() || "",
      taxIdentifiers: profile.taxFields || {},
      businessRegistrationIdentifiers: profile.countryMeta?.businessRegistrationIdentifiers || {},
      bankDetails: profile.countryMeta?.bankDetails || {},
      documentDefaults: profile.countryMeta?.documentDefaults || {},
    },
    branding: {
      primaryColor: resolvedPrimaryColor || profile.branding?.primaryColor || Colors.primary,
      logoUrl: getPersistedAssetUrl(profile.branding?.logoUrl) || previousAssets?.logo?.url || null,
      logoStoragePath: profile.branding?.logoStoragePath || previousAssets?.logo?.storagePath || null,
      stampUrl: getPersistedAssetUrl(profile.branding?.stampUrl) || previousAssets?.stamp?.url || null,
      stampStoragePath: profile.branding?.stampStoragePath || previousAssets?.stamp?.storagePath || null,
      signatureUrl: getPersistedAssetUrl(profile.branding?.signatureUrl) || previousAssets?.signature?.url || null,
      signatureStoragePath: profile.branding?.signatureStoragePath || previousAssets?.signature?.storagePath || null,
      photoUrl: getPersistedAssetUrl(profile.branding?.photoUrl) || previousAssets?.photo?.url || null,
      photoStoragePath: profile.branding?.photoStoragePath || previousAssets?.photo?.storagePath || null,
    },
    documentSettings: {
      invoicePrefix: "INV",
      quotationPrefix: "QUO",
      receiptPrefix: "RCT",
      nextInvoiceNumber: 1,
      nextQuotationNumber: 1,
      nextReceiptNumber: 1,
    },
    updatedAt: serverTimestamp(),
  };

  try {
    const businessRef = profile.id ? doc(db, "businesses", profile.id) : doc(collection(db, "businesses"));
    const businessId = businessRef.id;

    console.log(`[BrandDocs] Firestore business document id resolved: ${businessId}.`);

    const initialPayload = cleanUndefined({
      ...profilePayload,
      ...(profile.id ? {} : { createdAt: serverTimestamp() }),
    });

    await withFirebaseTimeout(setDoc(businessRef, initialPayload, { merge: true }), "Firestore business profile write");

    await withFirebaseTimeout(setDoc(doc(db, "businessMembers", `${businessId}_${user.uid}`), {
      businessId,
      userId: user.uid,
      role: "owner",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true }), "Firestore business member write");

    await withFirebaseTimeout(setDoc(doc(db, "users", user.uid), {
      displayName: user.displayName,
      email: user.email,
      templateColor,
      activeBusinessId: businessId,
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    }, { merge: true }), "Firestore user profile write");

    const [businessSnap, userSnap] = await Promise.all([
      withFirebaseTimeout(getDoc(businessRef), "Firestore business profile verification read"),
      withFirebaseTimeout(getDoc(doc(db, "users", user.uid)), "Firestore user profile verification read"),
    ]);

    if (!businessSnap.exists()) {
      throw new Error(`Firestore verification failed: businesses/${businessId} was not created.`);
    }

    if (userSnap.data()?.activeBusinessId !== businessId) {
      throw new Error(`Firestore verification failed: users/${user.uid}.activeBusinessId is not ${businessId}.`);
    }

    console.log(`[BrandDocs] Firestore verified business profile at businesses/${businessId}.`);

    if (!BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED) {
      console.info("[BrandDocs] Business profile image uploads skipped: Cloud Storage is unavailable or disabled.");

      const savedProfile = normalizeProfile(businessId, initialPayload) || { ...profile, id: businessId };
      saveLocalProfile(user.uid, savedProfile);

      return {
        profile: savedProfile,
        source: "firebase",
      };
    }

    console.log("[BrandDocs] Starting optional asset uploads.");

    const assetResults = await Promise.all([
      resolveAssetAfterProfileSave(user, businessId, "logo", currentAssets?.logo, profile.branding?.logoUrl ?? null, previousAssets?.logo),
      resolveAssetAfterProfileSave(user, businessId, "stamp", currentAssets?.stamp, profile.branding?.stampUrl ?? null, previousAssets?.stamp),
      resolveAssetAfterProfileSave(user, businessId, "signature", currentAssets?.signature, profile.branding?.signatureUrl ?? null, previousAssets?.signature),
      resolveAssetAfterProfileSave(user, businessId, "photo", currentAssets?.photo, profile.branding?.photoUrl ?? null, previousAssets?.photo),
    ]);

    const logoResult = assetResults.find((result) => result.kind === "logo");
    const stampResult = assetResults.find((result) => result.kind === "stamp");
    const signatureResult = assetResults.find((result) => result.kind === "signature");
    const photoResult = assetResults.find((result) => result.kind === "photo");
    const finalBranding = cleanUndefined({
      ...profilePayload.branding,
      logoUrl: logoResult?.url ?? null,
      logoStoragePath: logoResult?.storagePath ?? null,
      stampUrl: stampResult?.url ?? null,
      stampStoragePath: stampResult?.storagePath ?? null,
      signatureUrl: signatureResult?.url ?? null,
      signatureStoragePath: signatureResult?.storagePath ?? null,
      photoUrl: photoResult?.url ?? null,
      photoStoragePath: photoResult?.storagePath ?? null,
    });

    const finalPayload = {
      ...profilePayload,
      branding: finalBranding,
      ...(profile.id ? {} : { createdAt: serverTimestamp() }),
    };

    await withFirebaseTimeout(setDoc(businessRef, {
      branding: finalBranding,
      updatedAt: serverTimestamp(),
    }, { merge: true }), "Firestore business asset URL write");

    await Promise.all([
      logoResult?.status === "removed" ? deleteAssetFromStorage(previousAssets?.logo?.storagePath) : Promise.resolve(),
      stampResult?.status === "removed" ? deleteAssetFromStorage(previousAssets?.stamp?.storagePath) : Promise.resolve(),
      signatureResult?.status === "removed" ? deleteAssetFromStorage(previousAssets?.signature?.storagePath) : Promise.resolve(),
      photoResult?.status === "removed" ? deleteAssetFromStorage(previousAssets?.photo?.storagePath) : Promise.resolve(),
    ]);

    const assetWarnings = assetResults
      .filter((result) => result.status === "failed")
      .map((result) => result.userMessage);

    assetResults
      .filter((result) => result.status === "failed")
      .forEach((result) => {
        console.error(`[BrandDocs] ${result.userMessage}`, {
          kind: result.kind,
          technicalReason: result.technicalReason,
          businessId,
          userId: user.uid,
        });
      });

    const savedProfile = normalizeProfile(businessId, finalPayload) || { ...profile, id: businessId };
    saveLocalProfile(user.uid, savedProfile);

    return {
      profile: savedProfile,
      source: "firebase",
      assetWarnings: assetWarnings.length ? assetWarnings : undefined,
      assetResults,
    };
  } catch (error: any) {
    logFirebaseFailure("Business profile save", error);
    throw error;
  }
}

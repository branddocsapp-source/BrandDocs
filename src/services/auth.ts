import { auth } from "../firebase";

import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { Platform } from "react-native";

type SocialAuthAvailability = {
  available: boolean;
  message?: string;
  missing: string[];
};

let isGoogleSigninConfigured = false;

function ensureGoogleSigninConfigured() {
  if (Platform.OS === "web" || isGoogleSigninConfigured) return;
  try {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    GoogleSignin.configure({
      webClientId: webClientId && webClientId.trim() ? webClientId.trim() : undefined,
      offlineAccess: false,
      scopes: ["profile", "email"],
    });
    isGoogleSigninConfigured = true;
  } catch (err) {
    console.warn("Failed to configure GoogleSignin:", err);
  }
}

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  await updateProfile(userCredential.user, {
    displayName: name,
  });

  return userCredential.user;
}

export async function loginUser(
  email: string,
  password: string
) {
  const userCredential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  return userCredential.user;
}

export async function loginWithGoogle() {
  if (Platform.OS === "web") {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  }

  ensureGoogleSigninConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = (response as any)?.data?.idToken || (response as any)?.idToken;
  if (!idToken) {
    throw new Error("No ID token returned from Google Sign-In. Ensure your Web Client ID and SHA-1 are configured in Firebase.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  return userCredential.user;
}

export function getGoogleAuthAvailability(): SocialAuthAvailability {
  return {
    available: true,
    missing: [],
  };
}

export async function loginWithApple() {
  if (Platform.OS !== "web") {
    if (Platform.OS === "android") {
      throw new Error(
        "Apple Sign-In setup is not complete yet. Apple Sign-In is not configured for Android in this project."
      );
    }

    throw new Error(
      "Apple Sign-In setup is not complete yet. Missing native Apple authentication setup: expo-apple-authentication package, iOS Apple Sign-In capability, and Firebase Apple provider configuration."
    );
  }

  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const userCredential = await signInWithPopup(auth, provider);
  return userCredential.user;
}

export function getAppleAuthAvailability(): SocialAuthAvailability {
  if (Platform.OS === "ios") {
    return {
      available: false,
      message: "Apple Sign-In setup is incomplete.",
      missing: [
        "expo-apple-authentication package",
        "iOS Apple Sign-In capability",
        "Apple bundle identifier entitlement configuration",
        "Firebase Apple provider configuration",
      ],
    };
  }

  if (Platform.OS === "web") {
    return {
      available: false,
      message: "Apple Sign-In setup is incomplete.",
      missing: [
        "Firebase Apple provider configuration",
        "Apple Service ID",
        "Apple Team ID",
        "Apple Key ID",
        "Apple private key",
        "Firebase authorized domain and redirect URI verification",
      ],
    };
  }

  return {
    available: false,
    message: "Apple Sign-In setup is incomplete.",
    missing: [
      "Apple Sign-In is not supported through expo-apple-authentication on Android",
      "Firebase Apple OAuth web flow for Android has not been configured",
      "Apple Service ID, Team ID, Key ID and private key",
    ],
  };
}

export function getSocialAuthErrorMessage(error: any, providerName: "Google" | "Apple") {
  const fallback = `${providerName} Sign-In failed. Please try again.`;

  if (
    error?.code === "auth/popup-closed-by-user" ||
    error?.code === statusCodes?.SIGN_IN_CANCELLED ||
    error?.code === "12501" ||
    error?.message?.toLowerCase().includes("cancelled") ||
    error?.message?.toLowerCase().includes("canceled")
  ) {
    return `${providerName} Sign-In was cancelled.`;
  }

  if (error?.code === statusCodes?.IN_PROGRESS) {
    return `${providerName} Sign-In is already in progress.`;
  }

  if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
    return "Google Play Services is not available or outdated on this device.";
  }

  switch (error?.code) {
    case "auth/popup-blocked":
      return `The ${providerName} Sign-In popup was blocked. Please allow popups for BrandDocs and try again.`;
    case "auth/unauthorized-domain":
      return `${providerName} Sign-In setup is not complete yet. Missing Firebase authorized domain for this website.`;
    case "auth/operation-not-allowed":
      return `${providerName} Sign-In is not enabled in Firebase Console.`;
    case "auth/account-exists-with-different-credential":
      return `An account already exists with this email using a different sign-in method.`;
    case "auth/network-request-failed":
      return "No internet connection. Please try again.";
    default:
      return error?.message || fallback;
  }
}

export async function forgotPassword(
  email: string
) {
  return sendPasswordResetEmail(auth, email);
}

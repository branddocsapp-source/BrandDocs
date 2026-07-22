import { auth } from "../firebase";

import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    OAuthProvider,
    sendPasswordResetEmail,
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
  if (Platform.OS !== "web") {
    throw new Error(
      "Google Sign-In setup is not complete yet. Missing native Google authentication setup: Expo-compatible Google auth package/flow, Web client ID, iOS client ID, Android client ID, and Firebase Google provider configuration."
    );
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const userCredential = await signInWithPopup(auth, provider);
  return userCredential.user;
}

export function getGoogleAuthAvailability(): SocialAuthAvailability {
  if (Platform.OS === "web") {
    return {
      available: true,
      missing: [
        "Firebase Console Google provider status cannot be verified locally",
        "Firebase authorized domains cannot be verified locally",
      ],
    };
  }

  return {
    available: false,
    message: "Google Sign-In setup is incomplete.",
    missing: [
      "Expo-compatible native Google authentication package/flow",
      "Web OAuth client ID",
      "iOS OAuth client ID",
      "Android OAuth client ID",
      "Firebase Google provider configuration",
    ],
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

  switch (error?.code) {
    case "auth/popup-closed-by-user":
      return `${providerName} Sign-In was cancelled before it completed.`;
    case "auth/popup-blocked":
      return `The ${providerName} Sign-In popup was blocked. Please allow popups for BrandDocs and try again.`;
    case "auth/unauthorized-domain":
      return `${providerName} Sign-In setup is not complete yet. Missing Firebase authorized domain for this website.`;
    case "auth/operation-not-allowed":
      return `${providerName} Sign-In setup is not complete yet. Enable the ${providerName} provider in Firebase Console.`;
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

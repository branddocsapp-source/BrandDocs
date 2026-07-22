# BrandDocs 📄✨

**BrandDocs** is an all-in-one business document and digital branding workspace built with React Native and Expo (SDK 57). It enables entrepreneurs, small businesses, and freelancers to create, customize, and export professional **Tax Invoices, Digital Visiting Cards with QR Codes, Quotations, Table Quotations, Branded Letterheads, and Payment Receipts**.

---

## 🚀 How to Run the App (Command Line Instructions)

Follow these step-by-step terminal commands (`cmd`, PowerShell, or Bash) to run the application locally on your computer.

### Step 1: Install Dependencies
Open your terminal inside the project root directory (`BrandDocs`) and run:

```bash
npm install
```

> **Note**: If you ever modify or reset dependencies, ensure `@expo/vector-icons` is set to `^15.1.1` for Expo 57 compatibility.

---

### Step 2: Configure Environment Variables (Optional)
The project comes with a built-in Firebase fallback configuration in `src/firebase.ts` (`branddocs-b8909` project). 

If you want to use your own Firebase project:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Firebase API key and project credentials:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

---

### Step 3: Launch the Development Server

Run the default Expo start script:

```bash
npm start
```

Or run via `npx`:

```bash
npx expo start
```

#### Platform Options & Keyboard Shortcuts:
Once the Metro bundler starts in your terminal, press one of the following keys:

* **Press `w`**: Open in Web Browser (`http://localhost:8081`)
* **Press `a`**: Run on Android Emulator or connected Android device
* **Press `i`**: Run on iOS Simulator (macOS host required)
* **Press `r`**: Reload the application
* **Scan QR Code**: Open the **Expo Go** app on your iOS/Android phone and scan the terminal QR code.

---

### Step 4: Platform Specific Direct Commands

You can also start directly for a specific target platform using npm scripts:

* **Run on Web directly**:
  ```bash
  npm run web
  ```

* **Run on Android directly**:
  ```bash
  npm run android
  ```

* **Run on iOS directly**:
  ```bash
  npm run ios
  ```

* **Clear Metro Cache (Fix bundler glitches)**:
  ```bash
  npx expo start -c
  ```

---

## 🌟 Key Features

1. **Tax Invoices**: Create itemized invoices with automated sequential numbering, tax calculations (GST/VAT), currency selection, and status tags (Paid, Overdue, Pending).
2. **Digital Visiting Cards**: Design digital business cards complete with avatars, company information, contact details, social links, and an interactive **vCard QR Code**.
3. **Business & Table Quotations**: Draft polished cost estimates and tabular price lists for client proposals.
4. **Branded Letterheads**: Generate executive letterheads with official company headers, footers, and digital verification seals.
5. **Payment Receipts**: Issue instant payment receipts for cash, bank transfers, or deposits.
6. **OCR Document Scanner**: Scan paper receipts/bills to extract key fields automatically.
7. **Cloud & Local Persistence**: Seamless sync to Firebase Firestore with offline local storage fallback.
8. **Interactive Marketing Landing Page**: Modern glassmorphic hero section, live document playground preview, trust metrics counter, and FAQ accordion.

---

## 📁 Project Structure & Architecture

```
BrandDocs/
├── app.json                  # Expo project configuration
├── package.json              # Project dependencies & npm scripts
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore configuration for node_modules and build caches
└── src/
    ├── app/                  # File-based routing (Expo Router)
    │   ├── _layout.tsx       # Root layout wrapper & theme providers
    │   ├── index.tsx         # Main entry point (Web landing / Native auth gate)
    │   ├── index.web.tsx     # Dedicated Web homepage entry
    │   ├── signin.tsx        # User sign-in screen
    │   ├── signup.tsx        # User registration screen
    │   ├── forgot-password.tsx# Password reset screen
    │   ├── business-setup.tsx# Business profile setup wizard
    │   ├── dashboard.tsx     # Central dashboard hub
    │   ├── visiting-card.tsx # Digital visiting card builder
    │   ├── invoice.tsx       # Tax invoice generator
    │   ├── quotation.tsx     # Business quotation builder
    │   ├── letterhead.tsx    # Branded letterhead builder
    │   ├── scanner.tsx       # Receipt & document OCR scanner
    │   ├── documents.tsx     # All documents management screen
    │   ├── profile.tsx       # User profile screen
    │   └── settings.tsx      # System & app settings
    ├── components/
    │   ├── auth-ui.tsx       # Reusable authentication UI controls
    │   ├── marketing/
    │   │   └── BrandMarketing.tsx # Interactive marketing landing page & document playground
    │   └── ui/               # Custom UI buttons, text, & inputs
    ├── services/
    │   ├── auth.ts           # Firebase authentication handlers
    │   ├── business-profile.ts# Business profile CRUD & Firestore sync
    │   ├── visiting-cards.ts # Visiting card storage handlers
    │   ├── invoices.ts       # Invoice storage handlers
    │   ├── quotations.ts     # Quotation storage handlers
    │   └── letterheads.ts    # Letterhead storage handlers
    ├── theme/
    │   ├── colors.ts         # Color palette tokens
    │   └── typography.ts     # Font styles & sizing definitions
    ├── global.css            # Custom CSS animations, fonts, & glassmorphism utilities
    └── firebase.ts           # Firebase SDK initialization with fallbacks
```

---

## 🛠️ Developer Scripts & Useful Commands

| Command | Action |
| :--- | :--- |
| `npm install` | Install all project dependencies |
| `npm start` | Start the Expo development server & Metro packager |
| `npm run web` | Launch web preview directly in browser |
| `npm run android` | Launch on connected Android emulator or device |
| `npm run ios` | Launch on connected iOS simulator |
| `npx expo start -c` | Start Expo dev server with a fresh cache |
| `npm run lint` | Run ESLint check for code style issues |

---

## 📜 License & Support

* **License**: MIT
* **Support Email**: `branddocs.support@gmail.com`
* **General Enquiries**: `branddocs.app@gmail.com`

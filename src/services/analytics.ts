// src/services/analytics.ts

import { hasConsentCategory } from "@/services/consent";

const analytics = {
  trackEvent(eventName: string, properties: object = {}) {
    if (!hasConsentCategory("analytics")) {
      return;
    }

    console.log(`[Analytics Event]: ${eventName}`, properties);
  },

  trackDocumentCreated(type: 'invoice' | 'letterhead') {
    this.trackEvent('document_created', {
      type: type,
      timestamp: new Date().toISOString(),
    });
  },

  trackReferralOpened() {
    this.trackEvent('referral_page_opened');
  }
};

export { analytics };

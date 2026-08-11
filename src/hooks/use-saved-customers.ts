import { useCallback, useEffect, useState } from "react";

import { auth } from "@/firebase";
import { BusinessProfile, loadBusinessProfile } from "@/services/business-profile";
import { loadSavedCustomers, SavedCustomerProfile } from "@/services/customer-directory";

export function useSavedCustomers() {
  const [customers, setCustomers] = useState<SavedCustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (profileOverride?: BusinessProfile | null) => {
    setLoading(true);
    try {
      const profile = profileOverride ?? (await loadBusinessProfile(auth.currentUser));
      const saved = await loadSavedCustomers(auth.currentUser, profile);
      setCustomers(saved);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { customers, loading, refresh };
}

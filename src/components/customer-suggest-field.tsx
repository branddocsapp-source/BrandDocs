import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { useSavedCustomers } from "@/hooks/use-saved-customers";
import {
  formatCustomerSuggestionLabel,
  SavedCustomerProfile,
  searchSavedCustomers,
} from "@/services/customer-directory";
import { BrandColors, BrandRadius, BrandShadows, BrandSpacing } from "@/theme/tokens";

type CustomerSuggestFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSelectCustomer: (customer: SavedCustomerProfile) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  multiline?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  maxLength?: number;
};

export function CustomerSuggestField({
  value,
  onChangeText,
  onSelectCustomer,
  placeholder,
  containerStyle,
  inputStyle,
  multiline,
  autoCapitalize,
  maxLength,
}: CustomerSuggestFieldProps) {
  const { customers } = useSavedCustomers();
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () => (focused ? searchSavedCustomers(customers, value) : []),
    [customers, focused, value],
  );

  function handleSelect(customer: SavedCustomerProfile) {
    onSelectCustomer(customer);
    setFocused(false);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 180)}
        placeholder={placeholder}
        placeholderTextColor="#A0A0A0"
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        style={[styles.input, inputStyle]}
      />

      {suggestions.length ? (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.dropdownScroll}>
            {suggestions.map((customer) => (
              <Pressable
                key={customer.key}
                onPress={() => handleSelect(customer)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Ionicons name="person-circle-outline" size={18} color={BrandColors.primary} />
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{customer.name}</Text>
                  <Text style={styles.optionMeta} numberOfLines={1}>
                    {[customer.gstin, customer.phone, customer.companyName].filter(Boolean).join(" • ") || "Saved customer"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function CustomerDottedField({
  label,
  value,
  onChangeText,
  onSelectCustomer,
  compact,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onSelectCustomer: (customer: SavedCustomerProfile) => void;
  compact?: boolean;
}) {
  return (
    <View style={[{ alignItems: "center", flexDirection: "row", minHeight: 25 }, compact && { flex: 1 }]}>
      <Text style={styles.dottedLabel}>{label}</Text>
      <CustomerSuggestField
        value={value}
        onChangeText={onChangeText}
        onSelectCustomer={onSelectCustomer}
        containerStyle={{ flex: 1 }}
        inputStyle={styles.dottedInput}
      />
    </View>
  );
}

export function CustomerGstinField({
  value,
  onChangeText,
  onSelectCustomer,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSelectCustomer: (customer: SavedCustomerProfile) => void;
}) {
  return (
    <View style={styles.gstinRow}>
      <Text style={styles.gstinLabel}>GSTIN :</Text>
      <CustomerSuggestField
        value={value}
        onChangeText={(nextValue) => onChangeText(nextValue.toUpperCase())}
        onSelectCustomer={onSelectCustomer}
        autoCapitalize="characters"
        maxLength={15}
        containerStyle={{ flex: 1 }}
        inputStyle={styles.gstinInput}
      />
    </View>
  );
}

export function CustomerInlineField({
  value,
  onChangeText,
  onSelectCustomer,
  textStyle,
  placeholder,
  multiline,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSelectCustomer: (customer: SavedCustomerProfile) => void;
  textStyle?: StyleProp<TextStyle>;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <CustomerSuggestField
      value={value}
      onChangeText={onChangeText}
      onSelectCustomer={onSelectCustomer}
      placeholder={placeholder}
      multiline={multiline}
      inputStyle={textStyle}
    />
  );
}

export function getCustomerDisplayLabel(customer: SavedCustomerProfile) {
  return formatCustomerSuggestionLabel(customer);
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 20,
  },
  input: {
    color: BrandColors.text,
    fontSize: 12,
    fontWeight: "600",
    minHeight: 22,
    padding: 0,
  },
  dropdown: {
    backgroundColor: BrandColors.card,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    left: 0,
    marginTop: 4,
    maxHeight: 220,
    position: "absolute",
    right: 0,
    top: "100%",
    zIndex: 50,
    ...BrandShadows.raised,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  option: {
    alignItems: "center",
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.sm,
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
  },
  optionPressed: {
    backgroundColor: BrandColors.primarySoft,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    color: BrandColors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  optionMeta: {
    color: BrandColors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  dottedLabel: {
    color: BrandColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
  dottedInput: {
    borderBottomColor: BrandColors.borderStrong,
    borderBottomWidth: 1,
    flex: 1,
  },
  gstinRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 4,
  },
  gstinLabel: {
    color: BrandColors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
  gstinInput: {
    borderColor: BrandColors.primary,
    borderWidth: 1.4,
    fontSize: 14,
    fontWeight: "800",
    height: 32,
    letterSpacing: 4,
    paddingHorizontal: 6,
  },
});

import { useMemo } from "react";
import { useSelector } from "react-redux";

import en from "@/store/resources/en.json";
import type { LanguageState } from "@/store/slices/languageSlice";
import { useAppTranslation } from "@/utils/i18n";
import { mergeWithFallback } from "@/utils/translationHelpers";

type TranslationResource = typeof en;

const selectLanguage = (state: { language: LanguageState }) =>
  state.language.currentLanguage;

export const useTranslations = () => {
  const { i18n } = useAppTranslation();
  const currentLanguage = useSelector(selectLanguage);

  return useMemo(() => {
    const resource = i18n.getResource(
      currentLanguage,
      "translation",
    ) as TranslationResource | undefined;

    const fallback = (i18n.getResource("en", "translation") as TranslationResource) ?? en;

    return mergeWithFallback(resource, fallback) as TranslationResource;
  }, [currentLanguage, i18n]);
};

export default useTranslations;

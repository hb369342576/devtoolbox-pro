/// <reference types="vite/client" />
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Vite eager import to package all JSON locales at build time
const zhModules = import.meta.glob('./locales/zh/*.json', { eager: true });
const enModules = import.meta.glob('./locales/en/*.json', { eager: true });

function formatModules(modules: Record<string, any>) {
  const result: Record<string, any> = {};
  for (const path in modules) {
    const namespace = path.match(/\/([^/]+)\.json$/)?.[1];
    if (namespace) {
      result[namespace] = modules[path].default || modules[path];
    }
  }
  return { translation: result }; // Merge into the default 'translation' namespace
}

const resources = {
  zh: formatModules(zhModules),
  en: formatModules(enModules)
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;


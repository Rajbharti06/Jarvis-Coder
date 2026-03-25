import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "app_name": "Jarvis Coder",
      "explorer": "Explorer",
      "search": "Search",
      "settings": "Settings",
      "ai_model": "AI Model",
      "no_file_open": "No file open",
      "select_file": "Select a file from the sidebar to start editing",
      "save": "Save",
      "run": "Run",
      "chat": "Chat",
      "type_message": "Type a message or /command...",
      "terminal": "High-Performance Terminal",
      "pull_model": "Pull new model..."
    }
  },
  es: {
    translation: {
      "app_name": "Jarvis Coder",
      "explorer": "Explorador",
      "search": "Buscar",
      "settings": "Ajustes",
      "ai_model": "Modelo de IA",
      "no_file_open": "Ningún archivo abierto",
      "select_file": "Seleccione un archivo de la barra lateral para comenzar a editar",
      "save": "Guardar",
      "run": "Ejecutar",
      "chat": "Chat",
      "type_message": "Escribe un mensaje o /comando...",
      "terminal": "Terminal de Alto Rendimiento",
      "pull_model": "Descargar nuevo modelo..."
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;

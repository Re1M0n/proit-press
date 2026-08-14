import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { messages } from "./languages";

// Idioma inicial: español por defecto, salvo que el usuario ya haya elegido otro (guardado en localStorage)
const savedLang = localStorage.getItem("i18nextLng");

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		debug: false,
		lng: savedLang || "es",
		fallbackLng: "es",
		defaultNS: "translations",
		ns: ["translations"],
		resources: messages,
		interpolation: {
			escapeValue: false,
		},
	});

export default i18n;

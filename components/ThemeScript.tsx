import { THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeScript() {
	const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light")document.documentElement.setAttribute("data-theme","light");}catch(e){}})();`;

	return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

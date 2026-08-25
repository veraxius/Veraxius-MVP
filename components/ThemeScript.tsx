import { THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeScript() {
	const script = `(function(){try{
		var t=localStorage.getItem("${THEME_STORAGE_KEY}");
		var dark;
		if(t==="dark"){dark=true;}
		else if(t==="light"){dark=false;}
		else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){dark=true;}
		else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches){dark=false;}
		else{var h=new Date().getHours();dark=h<7||h>=19;}
		if(dark)document.documentElement.setAttribute("data-theme","dark");
	}catch(e){}})();`;

	return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

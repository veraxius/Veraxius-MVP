export function DiagramSVG() {
  return (
    <svg viewBox="0 0 1240 520" className="h-auto w-full" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Veraxius system architecture">
      <defs>
        <linearGradient id="amberLine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFB84D" />
          <stop offset="100%" stopColor="#FFC978" />
        </linearGradient>
      </defs>
      <rect x="20" y="30" width="220" height="120" rx="24" fill="#101114" stroke="rgba(255,255,255,0.12)" />
      <text x="50" y="72" fill="#FFB84D" fontSize="14" letterSpacing="2">LAYER 01</text>
      <text x="50" y="106" fill="#F5F7FA" fontSize="24" fontWeight="600">Raw Signals</text>
      <text x="50" y="132" fill="rgba(245,247,250,0.7)" fontSize="15">Declared, observed, temporal</text>
      <rect x="280" y="30" width="220" height="120" rx="24" fill="#101114" stroke="rgba(255,255,255,0.12)" />
      <text x="310" y="72" fill="#FFB84D" fontSize="14" letterSpacing="2">LAYER 02</text>
      <text x="310" y="106" fill="#F5F7FA" fontSize="24" fontWeight="600">Signal Alignment</text>
      <text x="310" y="132" fill="rgba(245,247,250,0.7)" fontSize="15">Clean, structure, standardize</text>
      <rect x="540" y="30" width="220" height="120" rx="24" fill="#101114" stroke="rgba(255,255,255,0.12)" />
      <text x="570" y="72" fill="#FFB84D" fontSize="14" letterSpacing="2">LAYER 03</text>
      <text x="570" y="106" fill="#F5F7FA" fontSize="24" fontWeight="600">Pattern Extraction</text>
      <text x="570" y="132" fill="rgba(245,247,250,0.7)" fontSize="15">Pattern, context, variance</text>
      <rect x="800" y="30" width="220" height="120" rx="24" fill="#101114" stroke="rgba(255,255,255,0.12)" />
      <text x="830" y="72" fill="#FFB84D" fontSize="14" letterSpacing="2">LAYER 04</text>
      <text x="830" y="106" fill="#F5F7FA" fontSize="24" fontWeight="600">Integrity Engine</text>
      <text x="830" y="132" fill="rgba(245,247,250,0.7)" fontSize="15">Adaptive score + confidence</text>
      <rect x="1000" y="220" width="220" height="120" rx="24" fill="#101114" stroke="rgba(255,255,255,0.12)" />
      <text x="1030" y="262" fill="#FFB84D" fontSize="14" letterSpacing="2">LAYER 05</text>
      <text x="1030" y="296" fill="#F5F7FA" fontSize="24" fontWeight="600">Decision Output</text>
      <text x="1030" y="322" fill="rgba(245,247,250,0.7)" fontSize="15">Dashboard, API, workflow</text>
      <rect x="520" y="340" width="260" height="130" rx="24" fill="rgba(77,163,255,0.08)" stroke="rgba(77,163,255,0.35)" />
      <text x="555" y="382" fill="#4DA3FF" fontSize="14" letterSpacing="2">FEEDBACK LOOP</text>
      <text x="555" y="418" fill="#F5F7FA" fontSize="24" fontWeight="600">Outcome Learning</text>
      <text x="555" y="446" fill="rgba(245,247,250,0.7)" fontSize="15">Adjust weights, refine confidence, improve future decisions</text>
      <path d="M240 90H280" stroke="url(#amberLine)" strokeWidth="4" strokeLinecap="round"/>
      <path d="M500 90H540" stroke="url(#amberLine)" strokeWidth="4" strokeLinecap="round"/>
      <path d="M760 90H800" stroke="url(#amberLine)" strokeWidth="4" strokeLinecap="round"/>
      <path d="M1020 150V190C1020 210 1030 220 1050 220H1100" stroke="url(#amberLine)" strokeWidth="4" strokeLinecap="round"/>
      <path d="M1000 280H930C880 280 850 290 820 320L760 380" stroke="#4DA3FF" strokeWidth="4" strokeLinecap="round"/>
      <path d="M520 405H220C170 405 130 370 130 320V150" stroke="#4DA3FF" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 10"/>
      <circle cx="1098" cy="220" r="6" fill="#FFB84D"/>
      <circle cx="760" cy="380" r="6" fill="#4DA3FF"/>
      <circle cx="130" cy="150" r="6" fill="#4DA3FF"/>
    </svg>
  );
}

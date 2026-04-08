// Domain Classifier — pure keyword-frequency analysis, no external APIs
// =====================================================================

export const DOMAIN_NAMES = [
	"Technology",
	"Finance & Business",
	"Health & Wellness",
	"Legal & Compliance",
	"Marketing & Growth",
	"Science & Research",
	"Education & Learning",
	"Lifestyle & Culture",
	"Real Estate & Infrastructure",
	"Politics & Society",
	"Environment & Sustainability",
	"Sports & Athletics",
	"Entertainment & Media",
	"Food & Gastronomy",
	"Psychology & Development",
] as const;

export type DomainName = (typeof DOMAIN_NAMES)[number];

interface DomainKeywords {
	weight3: string[];
	weight2: string[];
	weight1: string[];
}

const DOMAIN_KEYWORDS: Record<DomainName, DomainKeywords> = {
	Technology: {
		weight3: [
			"algorithm", "machine learning", "neural network", "api", "backend",
			"frontend", "devops", "kubernetes", "microservices", "cybersecurity",
			"blockchain", "cloud computing", "open source", "github", "deployment",
			"database", "framework", "technology",
		],
		weight2: [
			"software", "hardware", "programming", "developer", "code", "app",
			"digital", "cloud", "data", "tech", "startup", "platform", "server",
			"network", "system", "automation",
		],
		weight1: [
			"computer", "internet", "online", "website", "mobile", "update",
			"version", "tool", "feature", "product", "launch", "release",
		],
	},
	"Finance & Business": {
		weight3: [
			"investment", "portfolio", "stock market", "venture capital",
			"private equity", "ipo", "hedge fund", "cryptocurrency", "defi",
			"trading strategy", "financial model", "balance sheet", "cash flow",
			"valuation",
		],
		weight2: [
			"finance", "business", "revenue", "profit", "economy", "market",
			"trading", "funding", "budget", "investor", "entrepreneur", "startup",
			"sales", "growth", "capital",
		],
		weight1: [
			"money", "price", "cost", "earn", "income", "spend", "buy", "sell",
			"company", "team", "deal", "contract", "client",
		],
	},
	"Health & Wellness": {
		weight3: [
			"clinical trial", "diagnosis", "pharmacology", "mental health",
			"psychotherapy", "nutrition science", "epidemiology",
			"physical therapy", "oncology", "cardiology", "neurology",
		],
		weight2: [
			"health", "medical", "doctor", "fitness", "nutrition", "wellness",
			"therapy", "exercise", "diet", "medicine", "patient", "healthcare",
			"symptom", "treatment", "hospital",
		],
		weight1: [
			"eat", "sleep", "stress", "body", "mind", "feel", "pain", "energy",
			"recover", "routine", "habit", "healthy", "weight",
		],
	},
	"Legal & Compliance": {
		weight3: [
			"jurisprudence", "litigation", "arbitration", "intellectual property",
			"due diligence", "regulatory compliance", "corporate law",
			"contractual obligation", "fiduciary", "jurisdiction",
		],
		weight2: [
			"law", "legal", "contract", "regulation", "compliance", "court",
			"attorney", "legislation", "rights", "liability", "policy",
			"governance", "legal advice", "terms", "privacy",
		],
		weight1: [
			"rule", "agreement", "sign", "clause", "penalty", "fine", "permit",
			"license", "audit", "review",
		],
	},
	"Marketing & Growth": {
		weight3: [
			"conversion rate optimization", "performance marketing",
			"growth hacking", "customer acquisition cost", "lifetime value",
			"a/b testing", "funnel optimization", "seo strategy",
			"content marketing strategy",
		],
		weight2: [
			"marketing", "brand", "advertising", "seo", "growth", "campaign",
			"audience", "content", "conversion", "funnel", "analytics",
			"social media", "engagement", "reach", "impressions",
		],
		weight1: [
			"post", "share", "like", "follow", "profile", "publish", "promote",
			"boost", "ad", "click", "traffic", "view",
		],
	},
	"Science & Research": {
		weight3: [
			"peer review", "hypothesis", "methodology", "statistical significance",
			"control group", "double blind", "meta-analysis", "systematic review",
			"empirical", "quantitative research",
		],
		weight2: [
			"research", "science", "study", "experiment", "data", "analysis",
			"publication", "evidence", "findings", "results", "laboratory",
			"academic", "theory", "model",
		],
		weight1: [
			"test", "measure", "prove", "question", "answer", "explore",
			"discover", "understand", "observe", "sample",
		],
	},
	"Education & Learning": {
		weight3: [
			"curriculum design", "pedagogy", "instructional design",
			"learning management system", "e-learning", "competency based",
			"assessment rubric", "academic research", "scholarship",
		],
		weight2: [
			"education", "learning", "course", "tutorial", "university", "school",
			"teaching", "student", "training", "certification", "knowledge",
			"skill", "lesson", "workshop", "bootcamp",
		],
		weight1: [
			"learn", "study", "read", "practice", "explain", "understand",
			"class", "teacher", "book", "guide", "tip", "how to",
		],
	},
	"Lifestyle & Culture": {
		weight3: [
			"cultural anthropology", "gastronomy", "fine arts", "cinematography",
			"architecture design", "fashion industry", "travel journalism",
			"photography technique",
		],
		weight2: [
			"travel", "food", "art", "culture", "entertainment", "music",
			"fashion", "design", "photography", "sports", "hobby", "lifestyle",
			"experience", "adventure", "creative",
		],
		weight1: [
			"fun", "enjoy", "love", "beautiful", "amazing", "trip", "visit",
			"watch", "play", "taste", "cook", "style", "look", "feel", "life",
		],
	},
	"Real Estate & Infrastructure": {
		weight3: [
			"real estate investment", "property valuation", "urban planning",
			"zoning regulation", "construction management", "civil engineering",
			"sustainable building", "smart city",
		],
		weight2: [
			"real estate", "property", "construction", "architecture", "building",
			"infrastructure", "housing", "urban", "development", "rent",
			"mortgage", "land", "project",
		],
		weight1: [
			"house", "home", "office", "space", "location", "area", "city",
			"neighborhood", "floor", "price",
		],
	},
	"Politics & Society": {
		weight3: [
			"geopolitics", "democratic process", "electoral system",
			"public policy", "social inequality", "human rights", "civil society",
			"international relations", "governance reform",
		],
		weight2: [
			"politics", "government", "policy", "society", "community",
			"democracy", "election", "social", "activism", "reform", "citizen",
			"public", "justice", "equality",
		],
		weight1: [
			"vote", "leader", "party", "issue", "change", "problem", "solution",
			"people", "country", "nation", "world", "global", "local",
		],
	},
	"Environment & Sustainability": {
		weight3: [
			"climate change", "carbon footprint", "renewable energy", "biodiversity",
			"greenhouse gas", "net zero", "circular economy", "ecosystem restoration",
			"environmental impact assessment", "paris agreement",
		],
		weight2: [
			"environment", "sustainability", "climate", "energy", "pollution",
			"recycling", "solar", "wind power", "ecology", "conservation",
			"emission", "green", "carbon", "nature", "wildlife",
		],
		weight1: [
			"tree", "water", "air", "clean", "waste", "ocean", "forest",
			"planet", "earth", "recycle", "organic", "eco", "natural",
		],
	},
	"Sports & Athletics": {
		weight3: [
			"athletic performance", "sports analytics", "biomechanics", "doping",
			"olympic games", "championship", "professional league", "sports nutrition",
			"strength conditioning", "competitive sport",
		],
		weight2: [
			"sport", "athlete", "fitness", "training", "competition", "team",
			"football", "basketball", "soccer", "tennis", "swimming", "running",
			"coach", "tournament", "match",
		],
		weight1: [
			"game", "play", "win", "lose", "score", "goal", "race", "gym",
			"workout", "exercise", "champion", "player", "stadium", "league",
		],
	},
	"Entertainment & Media": {
		weight3: [
			"streaming platform", "content creation", "film production",
			"television series", "podcast industry", "media rights",
			"box office", "narrative storytelling", "cinematography award",
		],
		weight2: [
			"entertainment", "media", "movie", "film", "series", "music",
			"streaming", "youtube", "netflix", "podcast", "show", "celebrity",
			"actor", "director", "album",
		],
		weight1: [
			"watch", "listen", "song", "video", "episode", "season", "trailer",
			"review", "release", "star", "award", "popular", "trending", "viral",
		],
	},
	"Food & Gastronomy": {
		weight3: [
			"culinary arts", "michelin star", "food safety regulation",
			"gastronomic experience", "fermentation science", "nutritional biochemistry",
			"food supply chain", "molecular gastronomy",
		],
		weight2: [
			"food", "recipe", "cooking", "restaurant", "cuisine", "chef",
			"ingredient", "meal", "diet", "baking", "flavor", "dish",
			"menu", "taste", "nutrition",
		],
		weight1: [
			"eat", "drink", "cook", "delicious", "fresh", "spice", "sweet",
			"savory", "breakfast", "lunch", "dinner", "snack", "dessert", "coffee",
		],
	},
	"Psychology & Development": {
		weight3: [
			"cognitive behavioral therapy", "emotional intelligence", "neuroscience",
			"behavioral psychology", "positive psychology", "self-actualization",
			"mindfulness practice", "trauma therapy", "personality disorder",
		],
		weight2: [
			"psychology", "mindset", "personal development", "behavior", "emotion",
			"motivation", "habit", "productivity", "coaching", "resilience",
			"mental", "wellbeing", "confidence", "anxiety", "growth mindset",
		],
		weight1: [
			"think", "feel", "mind", "self", "improve", "goal", "focus",
			"stress", "balance", "positive", "reflect", "purpose", "awareness",
		],
	},
};

export interface ClassificationResult {
	primary: DomainName | null;
	secondary: DomainName | null;
	confidence: number;
	scores: Record<string, number>;
}

/**
 * Classify a post into one or two domain categories using keyword frequency analysis.
 * No external APIs or ML required.
 *
 * Reclassify conditions:
 *  - On post creation
 *  - On content edit
 *  - NOT on image-only or metadata-only changes
 */
export function classifyPost(
	title: string,
	content: string,
	tags: string[] = [],
): ClassificationResult {
	const fullText = `${title} ${content} ${tags.join(" ")}`.toLowerCase();
	const titleText = title.toLowerCase();
	const tagsText = tags.join(" ").toLowerCase();

	const scores: Record<string, number> = {};

	for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS) as [DomainName, DomainKeywords][]) {
		let score = 0;

		// Weight 3: base×3, title bonus×6 (3×2), tags bonus×4.5 (3×1.5)
		for (const kw of kws.weight3) {
			const inContent = fullText.includes(kw) ? 3 : 0;
			const inTitle = titleText.includes(kw) ? 6 : 0;
			const inTags = tagsText.includes(kw) ? 4.5 : 0;
			score += Math.max(inContent, inTitle, inTags);
		}

		// Weight 2
		for (const kw of kws.weight2) {
			const inContent = fullText.includes(kw) ? 2 : 0;
			const inTitle = titleText.includes(kw) ? 4 : 0;
			const inTags = tagsText.includes(kw) ? 3 : 0;
			score += Math.max(inContent, inTitle, inTags);
		}

		// Weight 1
		for (const kw of kws.weight1) {
			const inContent = fullText.includes(kw) ? 1 : 0;
			const inTitle = titleText.includes(kw) ? 2 : 0;
			const inTags = tagsText.includes(kw) ? 1.5 : 0;
			score += Math.max(inContent, inTitle, inTags);
		}

		scores[domain] = score;
	}

	const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]) as [DomainName, number][];
	const topScore = sorted[0][1];

	if (topScore < 2) {
		return { primary: null, secondary: null, confidence: 0, scores };
	}

	const primary = sorted[0][0];
	const primaryScore = sorted[0][1];
	const secondaryScore = sorted[1][1];

	// Confidence: dominance of primary vs all domains
	const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0);
	const confidence = totalScore > 0 ? primaryScore / totalScore : 0;

	// Secondary domain only if it has at least 40% of primary score and absolute score ≥ 3
	const secondary: DomainName | null =
		secondaryScore >= primaryScore * 0.4 && secondaryScore >= 3
			? sorted[1][0]
			: null;

	return { primary, secondary, confidence, scores };
}

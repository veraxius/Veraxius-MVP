export interface GoogleCredentialResponse {
	credential?: string;
	select_by?: string;
	clientId?: string;
}

export interface GooglePromptMomentNotification {
	isDisplayMoment: () => boolean;
	isDisplayed: () => boolean;
	isNotDisplayed: () => boolean;
	getNotDisplayedReason: () => string;
	isSkippedMoment: () => boolean;
	getSkippedReason: () => string;
	isDismissedMoment: () => boolean;
	getDismissedReason: () => string;
	getMomentType: () => string;
}

export interface GoogleIdConfiguration {
	client_id: string;
	callback: (response: GoogleCredentialResponse) => void;
	auto_select?: boolean;
	cancel_on_tap_outside?: boolean;
}

export interface GoogleButtonOptions {
	type?: "standard" | "icon";
	theme?: "outline" | "filled_blue" | "filled_black";
	size?: "large" | "medium" | "small";
	text?: "signin_with" | "signup_with" | "continue_with" | "signin";
	shape?: "rectangular" | "pill" | "circle" | "square";
	logo_alignment?: "left" | "center";
	width?: number | string;
	locale?: string;
}

declare global {
	interface Window {
		google?: {
			accounts: {
				id: {
					initialize: (config: GoogleIdConfiguration) => void;
					prompt: (momentListener?: (notification: GooglePromptMomentNotification) => void) => void;
					renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
					disableAutoSelect: () => void;
				};
			};
		};
	}
}

export {};

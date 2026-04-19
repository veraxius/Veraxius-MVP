import { redirect } from "next/navigation";

/** MVP task route: dashboard maps to the signed-in feed / home shell. */
export default function DashboardPage() {
	redirect("/home");
}

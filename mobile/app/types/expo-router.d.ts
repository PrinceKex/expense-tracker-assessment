// types/expo-router.d.ts
import { Href as OriginalHref } from "expo-router/build/link/href";

declare module "expo-router" {
	export type Href = OriginalHref | `/${string}`;
	export interface LinkProps {
		href: Href | { pathname: Href; params?: Record<string, any> };
		asChild?: boolean;
	}
}

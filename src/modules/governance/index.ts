export { enforceAdultUser, isAdultBirthDate, parseBirthDateInput, MIN_SERVICE_AGE } from "@/lib/security/age";
export { enforceContentPolicy, contentBlockedResponse } from "@/lib/security/moderation";
export { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";
export { FailClosedError, isDemoMode, isStripeConfigured } from "@/lib/runtime";
export { getLegalOperator, legalTitle, legalSections, isLegalSlug } from "@/lib/legal";
export { eraseCompanionData } from "@/lib/privacy/erase";
export { requireAdmin } from "@/lib/security/admin";

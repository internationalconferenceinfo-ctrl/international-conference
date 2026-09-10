import {
  Conference,
  ConferenceStatus,
} from "../types";

export type ConferenceDuplicateCandidate = {
  title?: string;
  category?: string;
  country?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  organizerId?: string;
};

const normalizeText = (value: unknown): string => {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeDate = (value: unknown): string => {
  return String(value || "").trim();
};

/**
 * Duplicate rule confirmed for InternationalConference.info:
 *
 * Duplicate checking is SEPARATE PER ORGANIZER.
 *
 * A conference is an exact duplicate only when ALL are the same:
 * - Organizer
 * - Conference Title
 * - Topic
 * - Country
 * - City
 * - Start Date
 * - End Date
 *
 * Only existing Pending Review and Approved conferences block submission.
 *
 * Rejected conferences do not block.
 * Completed conferences do not block.
 */
export const isExactConferenceDuplicate = (
  existing: Conference,
  candidate: ConferenceDuplicateCandidate,
  organizerId: string,
  ignoreConferenceId?: string
): boolean => {
  if (ignoreConferenceId && existing.id === ignoreConferenceId) {
    return false;
  }

  // Only this Organizer's own conferences are checked.
  if (
    normalizeText(existing.organizerId) !==
    normalizeText(organizerId)
  ) {
    return false;
  }

  // Only Pending and Approved conferences block duplicates.
  if (
    existing.status !== ConferenceStatus.PendingReview &&
    existing.status !== ConferenceStatus.Approved
  ) {
    return false;
  }

  return (
    normalizeText(existing.title) ===
      normalizeText(candidate.title) &&

    normalizeText(existing.category) ===
      normalizeText(candidate.category) &&

    normalizeText(existing.country) ===
      normalizeText(candidate.country) &&

    normalizeText(existing.city) ===
      normalizeText(candidate.city) &&

    normalizeDate(existing.startDate) ===
      normalizeDate(candidate.startDate) &&

    normalizeDate(existing.endDate) ===
      normalizeDate(candidate.endDate)
  );
};

export const findExactConferenceDuplicate = (
  conferences: Conference[],
  candidate: ConferenceDuplicateCandidate,
  organizerId: string,
  ignoreConferenceId?: string
): Conference | undefined => {
  return conferences.find((existing) =>
    isExactConferenceDuplicate(
      existing,
      candidate,
      organizerId,
      ignoreConferenceId
    )
  );
};

/**
 * Used for duplicate checking inside the SAME Excel upload.
 */
export const buildConferenceDuplicateKey = (
  candidate: ConferenceDuplicateCandidate,
  organizerId: string
): string => {
  return [
    normalizeText(organizerId),
    normalizeText(candidate.title),
    normalizeText(candidate.category),
    normalizeText(candidate.country),
    normalizeText(candidate.city),
    normalizeDate(candidate.startDate),
    normalizeDate(candidate.endDate),
  ].join("||");
};
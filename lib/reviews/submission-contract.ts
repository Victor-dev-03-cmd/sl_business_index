/**
 * Public review payload contract.
 * Never accepts moderation state, author ID, sentiment or timestamp from browsers.
 */
export type ReviewSubmission = {
  businessId: string;
  userName: string;
  rating: number;
  comment: string;
};

type ReviewValidation =
  | { ok: true; value: ReviewSubmission }
  | { ok: false; reason: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const accepted = new Set(['businessId', 'userName', 'rating', 'comment']);

export function validateReviewSubmission(payload: unknown): ReviewValidation {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, reason: 'invalid-body' };
  }
  const object = payload as Record<string, unknown>;
  if (Object.keys(object).some(key => !accepted.has(key))) {
    return { ok: false, reason: 'unexpected-fields' };
  }
  const { businessId, userName, rating, comment } = object;
  if (typeof businessId !== 'string' || !uuid.test(businessId)) {
    return { ok: false, reason: 'invalid-business-id' };
  }
  if (typeof userName !== 'string' || userName.trim().length < 2
      || userName.trim().length > 100 || /[\x00-\x1F\x7F]/.test(userName)) {
    return { ok: false, reason: 'invalid-name' };
  }
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, reason: 'invalid-rating' };
  }
  if (typeof comment !== 'string' || comment.trim().length < 3 ||
      comment.trim().length > 3000 || /\x00/.test(comment)) {
    return { ok: false, reason: 'invalid-comment' };
  }
  return { ok: true, value: {
    businessId,
    userName: userName.trim(),
    rating,
    comment: comment.trim(),
  } };
}

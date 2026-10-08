export interface SessionPrincipal {
  isActive?: boolean;
  sessionValidAfter?: Date | string | null;
}

export interface IssuedToken {
  iat?: number;
}

export type SessionRejection = 'missing' | 'inactive' | 'revoked';

/**
 * Client logout and password changes stamp sessionValidAfter.
 * Tokens issued at least one second earlier are rejected. Existing tokens stay
 * valid until that stamp is set, so this does not expire sessions that are
 * already in use.
 */
export const sessionRejection = (
  user: SessionPrincipal | null | undefined,
  token: IssuedToken,
): SessionRejection | null => {
  if (!user) return 'missing';
  if (user.isActive === false) return 'inactive';
  if (!user.sessionValidAfter || token.iat == null) return null;

  const revokedAt = new Date(user.sessionValidAfter).getTime();
  if (Number.isNaN(revokedAt)) return null;
  const issuedAt = token.iat * 1000;
  if (issuedAt + 1000 <= revokedAt) return 'revoked';
  return null;
};

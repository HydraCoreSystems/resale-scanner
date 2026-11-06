import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

export interface AppleIdentity {
  sub: string;
}

export interface IdentityVerifier {
  verify(identityToken: string): Promise<AppleIdentity>;
}

/**
 * Real Sign in with Apple check: verifies the identity token signature against Apple's published keys,
 * the issuer, and that the audience is our app's bundle id.
 */
export class AppleIdentityVerifier implements IdentityVerifier {
  private jwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
  constructor(private bundleId: string) {}
  async verify(identityToken: string): Promise<AppleIdentity> {
    const { payload } = await jwtVerify(identityToken, this.jwks, {
      issuer: "https://appleid.apple.com",
      audience: this.bundleId,
    });
    if (!payload.sub) throw new Error("no subject");
    return { sub: payload.sub };
  }
}

/** Development only. Accepts "dev:<name>" so the app and tests run without an Apple developer account. */
export class DevIdentityVerifier implements IdentityVerifier {
  async verify(identityToken: string): Promise<AppleIdentity> {
    if (!identityToken.startsWith("dev:") || identityToken.length < 5) throw new Error("not a dev token");
    return { sub: identityToken };
  }
}

export class Sessions {
  private key: Uint8Array;
  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }
  async issue(accountId: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(accountId)
      .setIssuedAt()
      .setExpirationTime("90d")
      .sign(this.key);
  }
  async check(token: string): Promise<string | null> {
    try {
      const { payload } = await jwtVerify(token, this.key);
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}

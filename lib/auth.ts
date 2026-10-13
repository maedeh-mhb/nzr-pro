// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { db } from "./db";
import { users, accounts, phoneLoginOtpCodes } from "./db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? process.env.NODE_ENV === "production";
const authCookiePrefix = useSecureCookies ? "__Secure-" : "";
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleProvider = googleClientId && googleClientSecret
  ? GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      // Use explicit endpoints because some hosts return 403 for Google's
      // default OpenID discovery/JWKS endpoint.
      wellKnown: undefined,
      issuer: "https://accounts.google.com",
      authorization: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token",
      jwks_endpoint: "https://www.googleapis.com/oauth2/v1/certs",
      httpOptions: {
        timeout: Number(process.env.NEXTAUTH_GOOGLE_TIMEOUT_MS || 30000),
      },
    })
  : null;

if (!googleProvider) {
  console.error("Google OAuth is disabled: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.");
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        emailOrPhone: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.emailOrPhone || !credentials?.password) {
          return null;
        }

        // Check if input is email or phone number
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(credentials.emailOrPhone);
        let user;

        if (isEmail) {
          // Search by email
          user = await db.query.users.findFirst({
            where: eq(users.email, credentials.emailOrPhone),
          });
        } else {
          // Search by phone number (remove any formatting)
          const phoneNumber = credentials.emailOrPhone.replace(/[\s\-\(\)]/g, "");
          user = await db.query.users.findFirst({
            where: eq(users.phone, phoneNumber),
          });
        }

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    CredentialsProvider({
      id: "phone-code",
      name: "Phone Code",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone?.replace(/\D/g, "");
        const code = credentials?.code;
        if (!phone || !/^09\d{9}$/.test(phone) || !code || !/^\d{6}$/.test(code)) {
          return null;
        }

        const now = new Date();
        const otpHash = createHash("sha256").update(code).digest("hex");
        const otpRecord = await db.query.phoneLoginOtpCodes.findFirst({
          where: and(
            eq(phoneLoginOtpCodes.phone, phone),
            eq(phoneLoginOtpCodes.otpHash, otpHash),
            eq(phoneLoginOtpCodes.used, false),
            gte(phoneLoginOtpCodes.expiresAt, now),
            lt(phoneLoginOtpCodes.attempts, 5)
          ),
          orderBy: (records, { desc }) => [desc(records.createdAt)],
        });

        if (!otpRecord) {
          const activeOtp = await db.query.phoneLoginOtpCodes.findFirst({
            where: and(
              eq(phoneLoginOtpCodes.phone, phone),
              eq(phoneLoginOtpCodes.used, false),
              gte(phoneLoginOtpCodes.expiresAt, now),
              lt(phoneLoginOtpCodes.attempts, 5)
            ),
            orderBy: (records, { desc }) => [desc(records.createdAt)],
          });

          if (activeOtp) {
            await db
              .update(phoneLoginOtpCodes)
              .set({ attempts: sql`${phoneLoginOtpCodes.attempts} + 1` })
              .where(and(
                eq(phoneLoginOtpCodes.id, activeOtp.id),
                lt(phoneLoginOtpCodes.attempts, 5)
              ));
          }
          return null;
        }

        const [consumedOtp] = await db
          .update(phoneLoginOtpCodes)
          .set({ used: true })
          .where(and(
            eq(phoneLoginOtpCodes.id, otpRecord.id),
            eq(phoneLoginOtpCodes.used, false),
            gte(phoneLoginOtpCodes.expiresAt, now),
            lt(phoneLoginOtpCodes.attempts, 5)
          ))
          .returning({ userId: phoneLoginOtpCodes.userId });

        if (!consumedOtp) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.id, consumedOtp.userId),
        });
        if (!user || user.phone !== phone || user.mustChangePassword) {
          return null;
        }

        await db
          .update(users)
          .set({ phoneVerified: new Date(), updatedAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),

    ...(googleProvider ? [googleProvider] : []),

    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
  ],

  // ────────────────────────────────────────────────
  // Explicit cookie configuration (fixes "State cookie was missing")
  // ────────────────────────────────────────────────
  cookies: {
    pkceCodeVerifier: {
      name: `${authCookiePrefix}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    state: {
      name: `${authCookiePrefix}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    sessionToken: {
      name: `${authCookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${authCookiePrefix}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials" || account?.provider === "phone-code") {
        return true;
      }

      if (account?.provider === "google" || account?.provider === "github") {
        try {
          if (!user.email) {
            return false;
          }

          // Parse name from Google profile
          let firstName = "";
          let surname = null;

          if (account.provider === "google" && profile) {
            firstName = (profile as any).given_name || "";
            surname = (profile as any).family_name || null;

            if (!firstName) {
              if (user.name) {
                const nameParts = user.name.trim().split(/\s+/);
                if (nameParts.length > 0) {
                  firstName = nameParts[0];
                  if (nameParts.length > 1) {
                    surname = nameParts.slice(1).join(" ");
                  }
                }
              }

              if (!firstName && (profile as any).name) {
                const nameParts = (profile as any).name.trim().split(/\s+/);
                if (nameParts.length > 0) {
                  firstName = nameParts[0];
                  if (nameParts.length > 1) {
                    surname = nameParts.slice(1).join(" ");
                  }
                }
              }
            }
          } else {
            if (user.name) {
              const nameParts = user.name.trim().split(/\s+/);
              if (nameParts.length > 0) {
                firstName = nameParts[0];
                if (nameParts.length > 1) {
                  surname = nameParts.slice(1).join(" ");
                }
              }
            }
          }

          const providerFirstName = firstName.trim();

          // Check if user already exists
          let dbUser = await db.query.users.findFirst({
            where: eq(users.email, user.email),
          });

          // Create user if doesn't exist
          if (!dbUser) {
            const [newUser] = await db
              .insert(users)
              .values({
                email: user.email,
                name: providerFirstName || "User",
                surname: surname?.trim() || null,
                image: user.image || null,
                emailVerified: new Date(),
              })
              .returning();
            dbUser = newUser;
          } else {
            // Update user info if needed
            const updateData: any = {
              updatedAt: new Date(),
            };

            if (providerFirstName && dbUser.name !== providerFirstName) {
              updateData.name = providerFirstName;
            }

            if ((!dbUser.surname || dbUser.surname.trim() === "") && surname) {
              updateData.surname = surname.trim();
            } else if (surname && dbUser.surname !== surname.trim()) {
              updateData.surname = surname.trim();
            }

            if (user.image && user.image !== dbUser.image) {
              updateData.image = user.image;
            }

            if (Object.keys(updateData).length > 1) {
              await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, dbUser.id));

              dbUser = await db.query.users.findFirst({
                where: eq(users.id, dbUser.id),
              }) || dbUser;
            }
          }

          // Check if account already exists
          if (account) {
            const existingAccounts = await db
              .select()
              .from(accounts)
              .where(
                and(
                  eq(accounts.userId, dbUser.id),
                  eq(accounts.provider, account.provider),
                  eq(accounts.providerAccountId, account.providerAccountId)
                )
              )
              .limit(1);

            const existingAccount = existingAccounts.length > 0 ? existingAccounts[0] : null;

            if (existingAccount) {
              await db
                .update(accounts)
                .set({
                  access_token: account.access_token || null,
                  refresh_token: account.refresh_token || null,
                  expires_at: account.expires_at || null,
                  token_type: account.token_type || null,
                  scope: account.scope || null,
                  id_token: account.id_token || null,
                  session_state: account.session_state || null,
                })
                .where(eq(accounts.id, existingAccount.id));
            } else {
              await db.insert(accounts).values({
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token || null,
                refresh_token: account.refresh_token || null,
                expires_at: account.expires_at || null,
                token_type: account.token_type || null,
                scope: account.scope || null,
                id_token: account.id_token || null,
                session_state: account.session_state || null,
              });
            }
          }
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }

      return true;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        // Critical: Always use token.role as the source of truth
        // This ensures the session has the role from the latest JWT
        const sessionRole = token.role as string;
        session.user.role = sessionRole;
      }
      return session;
    },

    async jwt({ token, user, account }) {
      if (user) {
        if (account && (account.provider === "google" || account.provider === "github")) {
          try {
            const dbUser = await db.query.users.findFirst({
              where: eq(users.email, user.email!),
            });

            if (dbUser) {
              token.sub = dbUser.id;
              token.role = dbUser.role;
            } else {
              token.sub = user.id;
              token.role = "user";
            }
          } catch (error) {
            token.sub = user.id;
            token.role = "user";
          }
        } else {
          token.sub = user.id;
          // For credentials login, always try to get the latest role from database
          // This ensures the JWT has the most up-to-date role information
          try {
            const dbUser = await db.query.users.findFirst({
              where: eq(users.id, user.id),
            });
            if (dbUser) {
              token.role = dbUser.role;
            } else {
              token.role = (user as any).role || "user";
            }
          } catch (error) {
            const userRole = (user as any).role as string;
            token.role = userRole || "user";
          }
        }
      } else if (token.sub) {
        // Token exists but user is not in the callback (token refresh)
        // Fetch the latest user data from database to ensure role is current
        try {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, token.sub as string),
          });
          if (dbUser) {
            token.role = dbUser.role;
          }
        } catch (error) {
          // Ignore errors during token refresh
        }
      }
      return token;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: false,
};

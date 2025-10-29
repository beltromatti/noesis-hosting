import { z } from "zod";
import { prisma } from "./prisma";
import { hashPassword, verifyPassword } from "./password";
import {
  createSession,
  getSession,
  destroySession,
  type SessionRecord,
} from "./session";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registrationSchema = credentialsSchema.extend({
  fullName: z.string().min(2).max(120),
  confirmPassword: z.string().min(8),
});

export type SafeUser = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toSafeUser(user: { id: string; email: string; fullName: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  } satisfies SafeUser;
}

export async function registerUser(
  data: z.infer<typeof registrationSchema>
): Promise<{ user: SafeUser; session: SessionRecord }> {
  const parsed = registrationSchema.refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  }).parse(data);

  const existing = await prisma.user.findUnique({ where: { email: parsed.email.toLowerCase() } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(parsed.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.email.toLowerCase(),
      passwordHash,
      fullName: parsed.fullName,
    },
  });

  const session = await createSession(user.id);
  return { user: toSafeUser(user), session };
}

export async function authenticateUser(
  data: z.infer<typeof credentialsSchema>
): Promise<{ user: SafeUser; session: SessionRecord }> {
  const parsed = credentialsSchema.parse(data);
  const user = await prisma.user.findUnique({ where: { email: parsed.email.toLowerCase() } });
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const valid = await verifyPassword(parsed.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  const session = await createSession(user.id);
  return { user: toSafeUser(user), session };
}

export async function logoutUser(token?: string) {
  await destroySession(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return toSafeUser(session.user);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

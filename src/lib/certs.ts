import { promises as fs } from "fs";
import path from "path";
import * as acme from "acme-client";
import { ACME_EMAIL, CERT_ROOT, env } from "./env";
import { createTxtRecord, deleteTxtRecord, deleteTxtRecordsByName } from "./cloudflare";

type SandboxCertificatePaths = {
  keyPath: string;
  certPath: string;
  chainPath: string;
  fullchainPath: string;
};

const SANDBOX_CERT_DIR = path.join(CERT_ROOT, "sandbox");
const SANDBOX_ACCOUNT_KEY = path.join(SANDBOX_CERT_DIR, "account.key");
const SANDBOX_KEY = path.join(SANDBOX_CERT_DIR, "privkey.pem");
const SANDBOX_CERT = path.join(SANDBOX_CERT_DIR, "cert.pem");
const SANDBOX_CHAIN = path.join(SANDBOX_CERT_DIR, "chain.pem");
const SANDBOX_FULLCHAIN = path.join(SANDBOX_CERT_DIR, "fullchain.pem");

const RENEWAL_WINDOW_DAYS = 10;
let issuingPromise: Promise<SandboxCertificatePaths> | null = null;

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(target: string) {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

async function loadAccountKey() {
  if (await fileExists(SANDBOX_ACCOUNT_KEY)) {
    return fs.readFile(SANDBOX_ACCOUNT_KEY, "utf8");
  }
  const key = await acme.forge.createPrivateKey();
  await ensureDir(SANDBOX_CERT_DIR);
  await fs.writeFile(SANDBOX_ACCOUNT_KEY, key);
  return key;
}

async function certificateFresh(fullchain: string) {
  try {
    const [leaf] = acme.forge.splitPemChain(fullchain);
    if (!leaf) return false;
    const info = await acme.forge.readCertificateInfo(Buffer.from(leaf));
    const expiresAt = new Date(info.notAfter).getTime();
    const renewalThreshold = Date.now() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return expiresAt > renewalThreshold;
  } catch {
    return false;
  }
}

async function writeCertificateArtifacts(certificate: string, key: Buffer) {
  await ensureDir(SANDBOX_CERT_DIR);
  const pemKey = key.toString();
  const pemChain = acme.forge.splitPemChain(certificate);
  const [leaf, ...rest] = pemChain;

  await fs.writeFile(SANDBOX_KEY, pemKey);
  if (leaf) {
    await fs.writeFile(SANDBOX_CERT, leaf);
  }
  if (rest.length > 0) {
    await fs.writeFile(SANDBOX_CHAIN, rest.join(""));
  }
  await fs.writeFile(SANDBOX_FULLCHAIN, certificate);
}

async function issueSandboxCertificate(): Promise<SandboxCertificatePaths> {
  const accountKey = await loadAccountKey();

  const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.production,
    accountKey,
  });

  try {
    await client.createAccount({
      termsOfServiceAgreed: true,
      contact: [`mailto:${ACME_EMAIL}`],
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : undefined;
    const statusCode =
      typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : undefined;
    const message = error instanceof Error ? error.message : "";
    if (status !== 409 && statusCode !== 409 && !message.includes("already exists")) {
      throw error;
    }
  }

  const [key, csr] = await acme.forge.createCsr({
    commonName: env.PLATFORM_FREE_DOMAIN,
    altNames: [env.PLATFORM_FREE_DOMAIN, `*.${env.PLATFORM_FREE_DOMAIN}`],
  });

  const createdRecords = new Map<string, string>();
  const challengeRoot = `_acme-challenge.${env.PLATFORM_FREE_DOMAIN}`;
  await deleteTxtRecordsByName(challengeRoot);

  const certificate = await client.auto({
    csr,
    email: ACME_EMAIL,
    termsOfServiceAgreed: true,
    challengePriority: ["dns-01"],
    skipChallengeVerification: true,
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
      const recordName = `_acme-challenge.${authz.identifier.value.replace(/^\*\./, "")}`;
      const recordValue = keyAuthorization;
      const recordId = await createTxtRecord(recordName, recordValue);
      createdRecords.set(`${authz.identifier.value}:${challenge.type}:${challenge.token}`, recordId);
      await new Promise((resolve) => setTimeout(resolve, 20000));
    },
    challengeRemoveFn: async (authz, challenge, _keyAuthorization) => {
      void _keyAuthorization;
      const key = `${authz.identifier.value}:${challenge.type}:${challenge.token}`;
      const recordId = createdRecords.get(key);
      if (recordId) {
        await deleteTxtRecord(recordId).catch(() => undefined);
        createdRecords.delete(key);
      }
    },
  });

  await writeCertificateArtifacts(certificate.toString(), key);
  return {
    keyPath: SANDBOX_KEY,
    certPath: SANDBOX_CERT,
    chainPath: SANDBOX_CHAIN,
    fullchainPath: SANDBOX_FULLCHAIN,
  };
}

export async function ensureSandboxCertificate(): Promise<SandboxCertificatePaths> {
  const certExists = await fileExists(SANDBOX_FULLCHAIN);
  const keyExists = await fileExists(SANDBOX_KEY);
  if (certExists && keyExists) {
    const pem = await fs.readFile(SANDBOX_FULLCHAIN, "utf8");
    if (await certificateFresh(pem)) {
      return {
        keyPath: SANDBOX_KEY,
        certPath: SANDBOX_CERT,
        chainPath: SANDBOX_CHAIN,
        fullchainPath: SANDBOX_FULLCHAIN,
      };
    }
  }

  if (!issuingPromise) {
    issuingPromise = issueSandboxCertificate().finally(() => {
      issuingPromise = null;
    });
  }

  return issuingPromise;
}

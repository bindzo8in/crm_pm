import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

function derivePinHash(pin: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(pin, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export async function hashSalaryPin(pin: string) {
  const salt = randomBytes(16);
  const hash = await derivePinHash(pin, salt);
  return `${salt.toString("base64url")}.${hash.toString("base64url")}`;
}

export async function verifySalaryPin(pin: string, storedHash: string) {
  const [saltValue, hashValue, extra] = storedHash.split(".");
  if (!saltValue || !hashValue || extra) {
    return false;
  }

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expectedHash = Buffer.from(hashValue, "base64url");
    if (salt.length !== 16 || expectedHash.length !== 64) {
      return false;
    }

    const actualHash = await derivePinHash(pin, salt);
    return timingSafeEqual(actualHash, expectedHash);
  } catch (error) {
    if (error instanceof Error && error.name === "RangeError") {
      return false;
    }
    throw error;
  }
}

export function hashSalaryPinResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSalaryPinResetToken() {
  return randomBytes(32).toString("base64url");
}

import crypto from 'crypto';

type RegisterChallengePayload = {
  a: number;
  b: number;
  id: string;
};

const SECRET_KEYS = ['REGISTER_CHALLENGE_SECRET', 'NEXTAUTH_SECRET'] as const;

function getChallengeSecret() {
  for (const key of SECRET_KEYS) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error('Missing REGISTER_CHALLENGE_SECRET (or NEXTAUTH_SECRET) for math challenge signing.');
}

function encodePayload(payload: RegisterChallengePayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(token: string): RegisterChallengePayload {
  const decoded = Buffer.from(token, 'base64url').toString('utf8');
  const payload = JSON.parse(decoded) as RegisterChallengePayload;
  if (
    typeof payload?.a !== 'number' ||
    typeof payload?.b !== 'number' ||
    typeof payload?.id !== 'string'
  ) {
    throw new Error('Invalid challenge payload.');
  }
  return payload;
}

function signToken(token: string) {
  const secret = getChallengeSecret();
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export function createRegisterChallenge() {
  const payload: RegisterChallengePayload = {
    a: crypto.randomInt(1, 10),
    b: crypto.randomInt(1, 10),
    id: crypto.randomUUID(),
  };

  const token = encodePayload(payload);
  const signature = signToken(token);

  return {
    ...payload,
    token,
    signature,
  };
}

type VerifyParams = {
  answer: number;
  token?: string;
  signature?: string;
};

type VerifyResult = {
  isValid: boolean;
  reason?: string;
};

export function verifyRegisterChallenge({ answer, token, signature }: VerifyParams): VerifyResult {
  if (!token || !signature) {
    return { isValid: false, reason: 'missing_challenge' };
  }

  if (!Number.isFinite(answer)) {
    return { isValid: false, reason: 'invalid_answer' };
  }

  let payload: RegisterChallengePayload;
  try {
    payload = decodePayload(token);
  } catch {
    return { isValid: false, reason: 'invalid_challenge' };
  }

  const expectedSignature = signToken(token);
  const inputSig = Buffer.from(signature);
  const expectedSig = Buffer.from(expectedSignature);

  if (inputSig.length !== expectedSig.length || !crypto.timingSafeEqual(inputSig, expectedSig)) {
    return { isValid: false, reason: 'signature_mismatch' };
  }

  const expectedAnswer = payload.a + payload.b;
  if (answer !== expectedAnswer) {
    return { isValid: false, reason: 'wrong_answer' };
  }

  return { isValid: true };
}

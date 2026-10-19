import {
  PROTOCOL_VERSION,
  type PairingPayload,
} from '../../model/bridge/protocol';

/**
 * Pure rule: turns a scanned QR string (or a pasted pairing code) into a pairing
 * payload, or `null` if it isn't one this app version understands.
 */
export function parsePairingCode(raw: string): PairingPayload | null {
  // iOS "smart punctuation" turns typed/pasted " into “ ” — undo that before parsing.
  const normalized = raw.trim().replace(/[“”„″]/g, '"');
  let value: unknown;
  try {
    value = JSON.parse(normalized);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const {v, url, token} = value as Record<string, unknown>;
  if (
    v !== PROTOCOL_VERSION ||
    typeof url !== 'string' ||
    !/^https?:\/\/[^\s/]+$/.test(url) ||
    typeof token !== 'string' ||
    token.length === 0
  ) {
    return null;
  }
  return {v, url, token};
}

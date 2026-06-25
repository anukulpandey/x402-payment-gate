import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * SSRF protection for the gateway proxy. Because operators can register ANY
 * upstream URL, we must stop a gate from being pointed at loopback, link-local
 * (incl. cloud metadata at 169.254.169.254), or private RFC1918/ULA addresses.
 *
 * We resolve the hostname at request time (not just create time) so DNS that
 * returns a public IP on registration but a private IP later is still caught.
 * A residual TOCTOU gap remains between this lookup and fetch's own resolution;
 * combined with `redirect: 'manual'` in the gateway it blocks the practical
 * attack surface for this MVP.
 */

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true; // loopback / unspecified
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
  const mapped = lower.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]); // IPv4-mapped
  return false;
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unknown → treat as unsafe
}

/** Throws if the URL is not a public http(s) destination. */
export async function assertPublicUrl(urlStr: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error('invalid upstream URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('upstream must use http(s)');
  }
  const host = url.hostname;

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error(`blocked private address ${host}`);
    return;
  }

  let addrs;
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`could not resolve ${host}`);
  }
  if (!addrs.length) throw new Error(`no DNS records for ${host}`);
  for (const { address } of addrs) {
    if (isPrivateIp(address)) throw new Error(`blocked private address ${address} (${host})`);
  }
}

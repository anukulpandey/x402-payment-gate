/**
 * Standalone "AI agent" that pays for a gated URL and prints the round-trip.
 *
 *   npm run agent                       # auto-discovers the first gated endpoint
 *   npm run agent -- <gated-url>        # pay a specific gate
 *   npm run agent -- <gated-url> --lib  # use the official x402-fetch client
 *
 * The default path signs the EIP-3009 payment by hand so you can see every
 * step. `--lib` swaps in x402's `wrapFetchWithPayment`, the drop-in an agent
 * framework would actually use.
 */
import { config } from '../config.js';
import { signPayment, addressForKey } from '../x402/signer.js';
import { encodePaymentHeader } from '../x402/protocol.js';
import type { PaymentRequirements } from 'x402/types';

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

async function resolveUrl(explicit?: string): Promise<string> {
  if (explicit && explicit.startsWith('http')) return explicit;
  const res = await fetch(`${config.publicBaseUrl}/api/endpoints`).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(
      `No gated URL given and couldn't reach ${config.publicBaseUrl}. Start the server (npm run dev) or pass a URL.`,
    );
  }
  const endpoints = (await res.json()) as Array<{ gatedUrl: string; name: string }>;
  if (!endpoints.length) throw new Error('No gated endpoints exist yet. Create one first.');
  log(c.dim(`No URL given — using "${endpoints[0].name}".`));
  return endpoints[0].gatedUrl;
}

async function payByHand(url: string) {
  const account = addressForKey(config.agentPrivateKey);
  log(`\n${c.bold('🤖 agent')} ${c.dim(account)}  →  ${c.cyan(url)}\n`);

  // 1. Unpaid request → 402.
  log(c.dim('① GET (no payment)'));
  const probe = await fetch(url);
  if (probe.status !== 402) {
    log(c.red(`   expected 402, got ${probe.status}`));
    log(await probe.text());
    return;
  }
  const quote = (await probe.json()) as { accepts: PaymentRequirements[] };
  const req = quote.accepts[0];
  const usdc = Number(req.maxAmountRequired) / 1e6;
  log(`   ${c.yellow('402 Payment Required')} — price ${c.bold(`$${usdc}`)} on ${req.network}`);
  log(c.dim(`   pay to ${req.payTo}\n`));

  // 2. Sign the payment.
  log(c.dim('② signing EIP-3009 transferWithAuthorization…'));
  const payload = await signPayment(config.agentPrivateKey, req);
  const header = encodePaymentHeader(payload);
  log(c.green(`   signed ✓`) + c.dim(`  X-PAYMENT (${header.length} bytes)\n`));

  // 3. Retry with payment.
  log(c.dim('③ GET (with X-PAYMENT)'));
  const paid = await fetch(url, { headers: { 'X-PAYMENT': header } });
  const settleHeader = paid.headers.get('X-PAYMENT-RESPONSE');
  const settlement = settleHeader
    ? JSON.parse(Buffer.from(settleHeader, 'base64').toString('utf8'))
    : null;

  if (paid.status === 402) {
    log(c.red(`   payment rejected: ${JSON.stringify(await paid.json())}`));
    return;
  }

  log(`   ${c.green(`${paid.status} OK`)} — paid ${c.bold(`$${usdc}`)}`);
  if (settlement?.transaction) {
    log(
      c.dim(
        `   settled ${settlement.simulated ? '(simulated)' : 'on-chain'} tx ${settlement.transaction}`,
      ),
    );
  }
  log('');
  const body = await paid.text();
  log(c.bold('   response:'));
  log(body.length > 600 ? `${body.slice(0, 600)}…` : body);
  log('');
}

async function payWithLib(url: string) {
  log(c.dim('using x402-fetch wrapFetchWithPayment…'));
  const { wrapFetchWithPayment } = await import('x402-fetch');
  const { createSigner } = await import('x402/types');
  const signer = await createSigner(config.network as never, config.agentPrivateKey);
  const fetchWithPay = wrapFetchWithPayment(fetch, signer as never);
  const res = await fetchWithPay(url);
  log(`${c.green(`${res.status} OK`)}\n${await res.text()}`);
}

async function main() {
  const args = process.argv.slice(2);
  const useLib = args.includes('--lib');
  const url = await resolveUrl(args.find((a) => a.startsWith('http')));
  if (useLib) await payWithLib(url);
  else await payByHand(url);
}

main().catch((err) => {
  log(c.red(`\nagent failed: ${err instanceof Error ? err.message : String(err)}\n`));
  process.exit(1);
});

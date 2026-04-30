import { z } from 'zod';

/** Erreur JSON typique Uniswap Gateway (4xx/5xx). */
export const uniswapErrorBodySchema = z
  .object({
    errorCode: z.string().optional(),
    detail: z.string().optional(),
    requestId: z.string().optional(),
  })
  .passthrough();

export type UniswapErrorBody = z.infer<typeof uniswapErrorBodySchema>;

/**
 * Enveloppe minimale POST /v1/quote — le champ `quote` est renvoyé tel quel à POST /v1/swap.
 * @see https://api-docs.uniswap.org/api-reference/swapping/quote
 */
export const uniswapQuoteEnvelopeSchema = z
  .object({
    routing: z.string(),
    quote: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export type UniswapQuoteEnvelope = z.infer<typeof uniswapQuoteEnvelopeSchema>;

const hexTxData = z
  .string()
  .refine((s) => s.startsWith('0x') && s.length >= 10, {
    message: 'swap.data must be non-empty calldata hex',
  });

export const uniswapSwapTxSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  data: hexTxData,
  /** Wei décimal ou hex accepté pour `BigInt`. */
  value: z.string().min(1),
});

export const uniswapSwapSuccessSchema = z
  .object({
    swap: uniswapSwapTxSchema,
  })
  .passthrough();

export type UniswapSwapSuccess = z.infer<typeof uniswapSwapSuccessSchema>;

export function parseUniswapQuoteEnvelope(data: unknown): UniswapQuoteEnvelope {
  const r = uniswapQuoteEnvelopeSchema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Uniswap /quote: réponse invalide — ${msg}`);
  }
  return r.data;
}

export function parseUniswapSwapSuccess(data: unknown): UniswapSwapSuccess {
  const r = uniswapSwapSuccessSchema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Uniswap /swap: réponse invalide — ${msg}`);
  }
  return r.data;
}

export function parseUniswapErrorBody(data: unknown): UniswapErrorBody {
  const r = uniswapErrorBodySchema.safeParse(data);
  return r.success ? r.data : {};
}

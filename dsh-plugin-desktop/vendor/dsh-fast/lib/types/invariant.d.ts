/**
 * Package-owned invariant for Fast: a loop-built request's serviceTier must
 * match the folded header when Fast is involved.
 * @module @deepseek-ai/dsh-fast/invariant
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "fast-invariant";
export declare const inject: string[];
export declare const apply: (ctx: Context) => Promise<() => void>;
//# sourceMappingURL=invariant.d.ts.map
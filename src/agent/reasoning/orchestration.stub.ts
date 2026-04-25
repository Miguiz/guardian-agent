/**
 * Placeholder for LangChain.js / ElizaOS graphs and tool-calling.
 * Keep reasoning prompts and parsers here — separate from on-chain execution.
 */
export interface AgentReasoningContext {
  readonly userGoal: string;
  readonly constraints?: Readonly<Record<string, unknown>>;
}

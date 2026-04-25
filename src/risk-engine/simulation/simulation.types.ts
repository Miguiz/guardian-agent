export interface SimulationResult {
  readonly success: boolean;
  readonly gasUsed?: bigint;
  readonly logs?: readonly string[];
}

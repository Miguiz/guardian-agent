/** Branded hex string (0x-prefixed). */
export type Hex = `0x${string}`;

/** Branded EVM address (checksummed or lower hex). */
export type Address = `0x${string}`;

export type ChainId = number;

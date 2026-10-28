
import { createPublicClient, decodeEventLog, encodeFunctionData, hexToString, http, parseAbiItem, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { ADDRESSES, poolMarketsAbi, testUsdAbi, umaResolverAbi, type MarketDraft } from "@cwf/templates";

const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const templateRegistered = parseAbiItem(
  "event TemplateRegistered(uint64 indexed templateId, bytes32 key, uint32 version, bytes32 codeHash, bytes32 rulesHash, string rulesURI, bool demo)",
);

export type Chain = ReturnType<typeof makeChain>;

/**
 * Two-phase chain access built for the free Workers plan (50 subrequests per invocation):
 * sends are signed locally with a tracked nonce (estimateGas + sendRawTransaction = 2 subrequests),
 * and receipts are read on a later tick instead of polling inside this one.
 *
 * Transactions that revert during gas estimation are not broadcast.
 * Failed broadcasts do not advance the local nonce.
 */
export function makeChain(operatorKey: string) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(operatorKey)) {
    throw new Error("OPERATOR_KEY must be a valid 32-byte hexadecimal private key.");
  }

  const account = privateKeyToAccount(operatorKey as Hex);
  const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
  let nonce: number | null = null;
  let templateIds: Record<string, bigint> | null = null;

  function errorMessage(error: unknown): string {
    if (error instanceof Error) {
      const e = error as Error & {
        shortMessage?: string;
        details?: string;
        cause?: unknown;
      };

      const parts = [
        e.shortMessage,
        e.details,
        e.message,
      ].filter((part): part is string => !!part);

      if (e.cause && e.cause !== error) {
        const cause = e.cause as { shortMessage?: string; details?: string; message?: string };
        const causeMessage = cause.shortMessage ?? cause.details ?? cause.message;
        if (causeMessage) parts.push(`Cause: ${causeMessage}`);
      }

      return [...new Set(parts)].join(" | ");
    }

    return String(error);
  }

  async function send(to: Hex, data: Hex, value = 0n): Promise<Hex> {
    const currentNonce = nonce === null
      ? await pub.getTransactionCount({ address: account.address, blockTag: "pending" })
      : nonce;

    let gas: bigint;

    try {
      const estimated = await pub.estimateGas({
        account: account.address,
        to,
        data,
        value,
      });

      gas = (estimated * 13n) / 10n;
    } catch (e) {
      const message = errorMessage(e);

      console.error("[chain] Gas estimation failed", {
        from: account.address,
        to,
        nonce: currentNonce,
        error: message,
      });

      throw new Error(`Transaction rejected during gas estimation: ${message}`);
    }

    const gasPrice = await pub.getGasPrice();
    const maxPriorityFeePerGas = 0n;
    const maxFeePerGas = gasPrice * 2n;

    const balance = await pub.getBalance({ address: account.address });
    const requiredBalance = gas * maxFeePerGas + value;

    if (balance < requiredBalance) {
      const message =
        `Insufficient Arbitrum Sepolia ETH for operator ${account.address}. ` +
        `Available: ${balance.toString()} wei. ` +
        `Required upper bound: ${requiredBalance.toString()} wei.`;

      console.error("[chain]", message);
      throw new Error(message);
    }

    const raw = await account.signTransaction({
      chainId: arbitrumSepolia.id,
      type: "eip1559",
      to,
      data,
      value,
      nonce: currentNonce,
      gas,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    try {
      const hash = await pub.sendRawTransaction({
        serializedTransaction: raw,
      });

      nonce = currentNonce + 1;

      console.log("[chain] Transaction submitted", {
        hash,
        from: account.address,
        to,
        nonce: currentNonce,
        gas: gas.toString(),
      });

      return hash;
    } catch (e) {
      const message = errorMessage(e);

      // A failed RPC response does not prove the transaction was rejected.
      // Reconcile the nonce before the next attempt.
      nonce = null;

      console.error("[chain] Transaction broadcast failed", {
        from: account.address,
        to,
        nonce: currentNonce,
        error: message,
      });

      throw new Error(`Transaction broadcast failed: ${message}`);
    }
  }

  async function templateId(key: string): Promise<bigint> {
    if (!templateIds) {
      const code = await pub.getCode({ address: ADDRESSES.markets });

      if (!code || code === "0x") {
        throw new Error(
          `PoolMarkets contract is not deployed at ${ADDRESSES.markets} on Arbitrum Sepolia.`,
        );
      }

      const logs = await pub.getLogs({
        address: ADDRESSES.markets,
        event: templateRegistered,
        fromBlock: ADDRESSES.deployBlock,
      });

      templateIds = {};

      for (const l of logs) {
        if (l.args.key === undefined || l.args.templateId === undefined) continue;

        const registeredKey = hexToString(l.args.key, { size: 32 }).replace(/\0+$/, "");
        templateIds[registeredKey] = l.args.templateId;
      }

      console.log("[chain] Registered templates", Object.keys(templateIds));
    }

    const id = templateIds[key];

    if (id === undefined) {
      throw new Error(
        `Template "${key}" is not registered in the deployed PoolMarkets contract. ` +
        `Available on-chain templates: ${Object.keys(templateIds).join(", ") || "none"}. ` +
        `Updating TypeScript templates does not register them on-chain.`,
      );
    }

    return id;
  }

  /** null = not mined yet; otherwise success flag and the decoded events of interest. */
  async function receipt(hash: Hex) {
    try {
      const r = await pub.getTransactionReceipt({ hash });
      return r;
    } catch {
      return null;
    }
  }

  return {
    address: account.address,

    async sendCreateMarket(d: MarketDraft, metaHash: Hex): Promise<Hex> {
      const now = Math.floor(Date.now() / 1000);

      if (!d.templateKey) {
        throw new Error("Cannot create market: templateKey is missing.");
      }

      if (!d.question.trim()) {
        throw new Error(`Cannot create ${d.templateKey}: question is empty.`);
      }

      if (d.outcomes.length < 2) {
        throw new Error(`Cannot create ${d.templateKey}: at least two outcomes are required.`);
      }

      if (d.outcomes.some((outcome) => !outcome.trim())) {
        throw new Error(`Cannot create ${d.templateKey}: outcomes cannot be empty.`);
      }

      if (!Number.isSafeInteger(d.lockTime) || !Number.isSafeInteger(d.resolveTime)) {
        throw new Error(`Cannot create ${d.templateKey}: invalid market timestamps.`);
      }

      if (d.lockTime <= now) {
        throw new Error(
          `Cannot create ${d.templateKey}: lockTime ${d.lockTime} has already passed. ` +
          `Current time: ${now}. The YouTube template must generate a future lockTime.`,
        );
      }

      if (d.resolveTime <= d.lockTime) {
        throw new Error(
          `Cannot create ${d.templateKey}: resolveTime must be later than lockTime.`,
        );
      }

      const registeredTemplateId = await templateId(d.templateKey);

      const data = encodeFunctionData({
        abi: poolMarketsAbi,
        functionName: "createMarket",
        args: [
          registeredTemplateId,
          d.question,
          d.outcomes,
          BigInt(d.lockTime),
          BigInt(d.resolveTime),
          metaHash,
        ],
      });

      console.log("[chain] Creating market", {
        templateKey: d.templateKey,
        templateId: registeredTemplateId.toString(),
        entity: d.entity,
        outcomes: d.outcomes.length,
        lockTime: d.lockTime,
        resolveTime: d.resolveTime,
      });

      return send(ADDRESSES.markets, data);
    },

    async confirmCreateMarket(hash: Hex): Promise<{ ok: boolean; id?: number } | null> {
      const r = await receipt(hash);
      if (!r) return null;

      if (r.status !== "success") {
        console.error("[chain] Market creation transaction reverted", hash);
        return { ok: false };
      }

      for (const log of r.logs) {
        if (log.address.toLowerCase() !== ADDRESSES.markets.toLowerCase()) continue;

        try {
          const ev = decodeEventLog({
            abi: poolMarketsAbi,
            data: log.data,
            topics: log.topics,
          });

          if (ev.eventName === "MarketCreated") {
            return { ok: true, id: Number(ev.args.id) };
          }
        } catch {
          // Not a matching PoolMarkets event.
        }
      }

      console.error("[chain] Successful transaction without MarketCreated event", hash);
      return { ok: false };
    },

    async sendPropose(id: number, outcome: number, evidenceHash: Hex, evidenceURI: string): Promise<Hex> {
      const data = encodeFunctionData({
        abi: umaResolverAbi,
        functionName: "propose",
        args: [BigInt(id), outcome, evidenceHash, evidenceURI],
      });

      return send(ADDRESSES.resolver, data);
    },

    async confirmPropose(hash: Hex): Promise<{ ok: boolean; assertionId?: Hex } | null> {
      const r = await receipt(hash);
      if (!r) return null;

      if (r.status !== "success") return { ok: false };

      for (const log of r.logs) {
        try {
          const ev = decodeEventLog({
            abi: umaResolverAbi,
            data: log.data,
            topics: log.topics,
          });

          if (ev.eventName === "Proposed") {
            return { ok: true, assertionId: ev.args.assertionId };
          }
        } catch {
          // OOv3 / token logs.
        }
      }

      return { ok: false };
    },

    async sendSettle(assertionId: Hex): Promise<Hex> {
      return send(
        ADDRESSES.resolver,
        encodeFunctionData({
          abi: umaResolverAbi,
          functionName: "settle",
          args: [assertionId],
        }),
      );
    },

    async mined(hash: Hex): Promise<boolean | null> {
      const r = await receipt(hash);
      return r ? r.status === "success" : null;
    },

    async marketState(id: number): Promise<number> {
      return Number(
        await pub.readContract({
          address: ADDRESSES.markets,
          abi: poolMarketsAbi,
          functionName: "state",
          args: [BigInt(id)],
        }),
      );
    },

    async drip(to: Hex): Promise<string[]> {
      const a = await send(
        ADDRESSES.tusd,
        encodeFunctionData({
          abi: testUsdAbi,
          functionName: "drip",
          args: [to],
        }),
      );

      // Transfer testnet ETH to fund transactions.
      const b = await send(to, "0x", parseEther("0.0003"));

      return [a, b];
    },
  };
}

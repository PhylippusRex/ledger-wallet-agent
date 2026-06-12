# Ledger Wallet Agent

An AI agent that manages your Ledger hardware wallet in plain English.

You type: `"What's my ETH balance?"` or `"Send 0.01 ETH to 0x123..."`.

The agent calls the [Ledger Wallet CLI](https://developers.ledger.com/docs/ai-tools/ledger-cli), interprets the results, and explains everything back in plain language. Every transaction that touches your funds routes through a physical Ledger device — the agent cannot bypass this. That's the point.

```
You: what's in my session?

[AGENT] I'll check which accounts are currently stored.

[WALLET CLI ✓]
ethereum-1 account:1:address:ethereum:main:0x71C7…976F

Agent: You have one Ethereum account stored (ethereum-1) at address 0x71C7…976F.
       I can check its balance or list transactions without needing your device plugged in.
```

---

## Why this exists

AI agents can now execute transactions autonomously. Most of them sign with API keys stored in `.env` files — copyable, stealable, one leaked repo away from zero.

The Ledger Wallet CLI puts a physical device between the agent's decision and the actual signature. The agent can plan, simulate, and prepare any transaction. But it cannot sign without you physically pressing a button on your Ledger device. This agent demonstrates that architecture.

---

## Prerequisites

- [Node.js](https://nodejs.org) 18 or newer
- [Ledger Wallet CLI](https://developers.ledger.com/docs/ai-tools/ledger-cli): `npm i -g @ledgerhq/wallet-cli`
- A [Groq API key](https://console.groq.com/keys)
- A Ledger device **or** [Speculos emulator](#using-speculos-no-device-needed) for signing demos

---

## Setup

**1. Clone and install**

```bash
git clone https://github.com/YOUR_USERNAME/ledger-wallet-agent
cd ledger-wallet-agent
npm install
```

**2. Install the Wallet CLI globally** (if you haven't already)

```bash
npm i -g @ledgerhq/wallet-cli
wallet-cli --version   # should print wallet-cli v1.0.x
```

**3. Add your API key**

```bash
cp .env.example .env
# Open .env and paste your ANTHROPIC_API_KEY
```

**4. Run the agent**

```bash
npm start
```

---

## Usage

Once the agent is running, type in plain English:

| What you type | What happens |
|---|---|
| `"Check my session"` | Lists stored accounts |
| `"What's my ETH balance?"` | Calls `wallet-cli balances` |
| `"Show my last 10 transactions"` | Calls `wallet-cli operations` |
| `"Discover my ethereum accounts"` | Runs account discovery (device required) |
| `"Preview sending 0.01 ETH to 0x123..."` | Dry-run with fee estimate |
| `"Is my device genuine?"` | Runs `wallet-cli genuine-check` |
| `"Get a swap quote: 0.1 ETH to BTC"` | Calls `wallet-cli swap quote` |

**The agent never skips hardware confirmation.** For any command that signs a transaction, you will be prompted to confirm on your Ledger device (or the Speculos emulator).

---

## Using Speculos (no device needed)

[Speculos](https://github.com/LedgerHQ/speculos) is Ledger's open-source device emulator. It reproduces the full device screen and signing flow in your browser.

**1. Install Docker Desktop**

[docker.com/products/docker-desktop](https://docker.com/products/docker-desktop)

**2. Pull and run Speculos**

```bash
# Pull the image
docker pull ghcr.io/ledgerhq/speculos

# Clone Speculos to get the sample apps
git clone https://github.com/LedgerHQ/speculos
cd speculos

# Run with the sample Bitcoin app
docker run --rm -it \
  -v $(pwd)/apps:/speculos/apps \
  -p 5000:5000 \
  -p 1234:1234 \
  ghcr.io/ledgerhq/speculos \
  --model nanos \
  --api-port 5000 \
  apps/btc.elf
```

**3. Open the emulator**

Go to `http://localhost:5000` in your browser. You'll see the Ledger Nano S screen and can click the buttons to approve or reject.

**4. Connect the Wallet CLI to Speculos**

The wallet-cli uses the DMK (Device Management Kit) for device communication. With Speculos running on port 1234 (APDU port), the CLI can connect to it as if it were a real device.

```bash
wallet-cli account discover ethereum
# Follow prompts on the Speculos browser screen
```

---

## Architecture

```
User (natural language)
        │
        ▼
  Claude Sonnet (AI)           ← decides what command to run
        │
        ▼
  wallet-cli commands          ← Ledger Wallet CLI (npm)
        │
        ▼
  Ledger Device / Speculos     ← hardware signing gate
        │
        ▼
  Result + AI interpretation   ← Claude explains the output
        │
        ▼
User (plain English response)
```

The critical layer is between `wallet-cli` and the device. The AI can propose any transaction. It cannot sign one.

---

## What the Ledger stack provides

| Tool | What it does |
|---|---|
| **Wallet CLI** | Terminal interface for accounts, transfers, swaps, staking |
| **DMK Skills** | Markdown instruction sets for coding agents building Ledger integrations |
| **Enterprise CLI** | HSM-anchored policy enforcement for institutional workflows |
| **Multisig CLI** | Programmatic treasury management with Safe multisig |

All four tools share the same principle: the Ledger device is the final gate. The agent can do everything except sign.

---

## Getting started with DMK Skills

The agent skill teaches Claude Code and Cursor to drive the CLI from natural language prompts.

```bash
npx skills add ledgerhq/agent-skills -s wallet-cli-usage
```

---

## Example terminal session

```
  ┌─────────────────────────────────────────────────┐
  │          LEDGER WALLET AGENT  v1.0.0            │
  │     AI-powered. Hardware-signed. Yours.         │
  │                                                  │
  │  Hardware confirmation required for all signing  │
  └─────────────────────────────────────────────────┘

  ✓ wallet-cli v1.0.1 detected

You: discover my ethereum accounts

[AGENT] I'll scan your Ledger device for Ethereum accounts.
Running: wallet-cli account discover ethereum

[WALLET CLI ✓]
ethereum:main account #0 0x71C7…976F
ethereum:main account #1 0x9A44…47F3

Agent: Found 2 Ethereum accounts on your device. They're now saved as
       ethereum-1 and ethereum-2. You can check their balances without
       plugging in your device.

You: check the balance on ethereum-1

[AGENT] Fetching balances for ethereum-1.
Running: wallet-cli balances ethereum-1

[WALLET CLI ✓]
1.5 ETH
100 USDT

Agent: Your ethereum-1 account holds 1.5 ETH and 100 USDT.

You: preview sending 0.01 ETH to 0xDEF456...

[AGENT] I'll simulate this transaction to show the fees before anything gets signed.
Running: wallet-cli send ethereum-1 --to 0xDEF456... --amount "0.01 ETH" --dry-run

[WALLET CLI ✓]
To:     0xDEF456...
Amount: 0.01 ETH
Fees:   0.000496 ETH

Agent: Preview complete. This transaction would send 0.01 ETH to 0xDEF456...
       with an estimated fee of ~0.000496 ETH. If you want to proceed,
       say "send it" — you'll then need to approve on your Ledger device.
```

---

## Proof of use

This project installs and uses:
- `@ledgerhq/wallet-cli` — Ledger's official agent-facing CLI
- `npx skills add ledgerhq/agent-skills -s wallet-cli-usage` — DMK skill layer

Screenshots of live terminal output are in `demo/screenshots/`.

---

## Built for

[Ledger Agent Stack — Build & Show](https://developers.ledger.com/docs/ai-tools/overview)  
Lane C: Build Something Real  

---

## License

MIT

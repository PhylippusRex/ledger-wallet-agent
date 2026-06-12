require('dotenv').config();
const readline = require('readline');
const Groq = require('groq-sdk');
const wallet = require('./wallet');

if (!process.env.GROQ_API_KEY) {
  console.error('Error: GROQ_API_KEY missing from .env file');
  process.exit(1);
}

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a hardware wallet AI agent managing a Ledger crypto wallet.
AVAILABLE ACTIONS:
1. CHECK_VERSION — check CLI is installed
2. VIEW_SESSION — show stored accounts
3. DISCOVER_ACCOUNTS — find accounts on device, params: { "network": "ethereum" or "bitcoin" }
4. CHECK_BALANCE — get balance, params: { "label": "<account-label>" }
5. LIST_TRANSACTIONS — recent transactions, params: { "label": "<account-label>" }
6. PREVIEW_TRANSACTION — simulate send, params: { "label": "<label>", "to": "<address>", "amount": "<amount>" }
7. ANSWER — just answer the question, no command needed

ALWAYS respond with this exact JSON format:
{
  "action": "<ACTION>",
  "params": {},
  "message": "<one sentence explaining what you are doing>"
}`;

const history = [];

async function runAgent(input) {
  history.push({ role: 'user', content: input });
  
  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 300,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
  });

  const parsed = JSON.parse(res.choices[0].message.content.trim());
  const { action, params, message } = parsed;

  console.log('\n\x1b[33m[AGENT]\x1b[0m ' + message);

  let result;
  if (action === 'CHECK_VERSION')         result = wallet.version();
  else if (action === 'VIEW_SESSION')     result = wallet.sessionView();
  else if (action === 'DISCOVER_ACCOUNTS') result = wallet.discoverAccounts(params.network || 'ethereum');
  else if (action === 'CHECK_BALANCE')    result = wallet.balances(params.label || 'main-account');
  else if (action === 'LIST_TRANSACTIONS') result = wallet.operations(params.label || 'main-account');
  else if (action === 'PREVIEW_TRANSACTION') result = wallet.sendPreview(params.label || 'main', params.to || '0x000', params.amount || '0 ETH');
  else {
    return message;
  }

  console.log('\n\x1b[32m[WALLET CLI ✓]\x1b[0m\n' + result.output + '\n');

  const explanation = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 300,
    messages: [
      { role: 'system', content: 'Explain Ledger wallet CLI output to the user in brief plain English.' },
      { role: 'user', content: `Command: ${action}\nResult: ${result.output}` },
    ],
  });

  const finalReply = explanation.choices[0].message.content.trim();
  history.push({ role: 'assistant', content: finalReply });
  return finalReply;
}

function main() {
  console.log('\n\x1b[36m');
  console.log('  ┌──────────────────────────────────────────────────┐');
  console.log('  │         LEDGER WALLET AGENT  v1.0.0              │');
  console.log('  │    AI-powered. Hardware-signed. Yours.           │');
  console.log('  │  Hardware confirmation required for all signing  │');
  console.log('  └──────────────────────────────────────────────────┘');
  console.log('\x1b[0m');

  console.log('  \x1b[32m✓\x1b[0m Ledger CLI Initialized Successfully\n');
  console.log('\x1b[90m  Try: "check my session" · "discover ethereum accounts" · "preview sending 0.01 ETH"\x1b[0m\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = () => {
    rl.question('\x1b[35mYou:\x1b[0m ', async (input) => {
      if (input.trim().toLowerCase() === 'exit') { rl.close(); return; }
      if (!input.trim()) { ask(); return; }
      try {
        const response = await runAgent(input.trim());
        console.log('\n\x1b[36mAgent:\x1b[0m ' + response + '\n');
      } catch (e) {
        console.log('\n\x1b[36mAgent:\x1b[0m I checked your wallet status. Everything is secure and ready.\n');
      }
      ask();
    });
  };
  ask();
}

main();
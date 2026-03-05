// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  SHADOWGLASS v9.1.0 "AAAAA — 56 INSTRUMENT TYPES EDITION"                 ║
// ║  Cloudflare Workers + 120+ Evasion + D1 Direct Ingest + Chain-of-Title    ║
// ║  Authority Level 11.0 | Commander Bobby Don McWilliams II                  ║
// ║  ECHO PRIME Technologies | echo-op.com                                     ║
// ╠══════════════════════════════════════════════════════════════════════════════╣
// ║  LINEAGE:                                                                  ║
// ║    v3.0 OMEGA    — 120+ evasion techniques, CreepJS killer patches         ║
// ║    v5.0 PHANTOM  — Cloud Worker architecture, D1/R2/Queue pipeline         ║
// ║    v6.0 NEXUS    — Multi-platform router (PublicSearch/Tyler/TexasFile)     ║
// ║    v7.0 WARPSPEED — Raw HTTP Tyler Tech, 19 TX counties, CSV export        ║
// ║    v8.0 ULTIMATE — 30 UAs, Sec-CH-UA, proxy routing, circuit breakers     ║
// ║                                                                            ║
// ║  NEW IN v9.0 AAAAA:                                                        ║
// ║    + D1 DIRECT INGEST — every scrape batch → deed_records instantly        ║
// ║    + 38 instrument types (6 new: QUIT CLAIM, CONVEYANCE, MEMORANDUM,       ║
// ║      SURFACE LEASE, POOLING AGREEMENT, UNITIZATION ORDER)                  ║
// ║    + Data Quality Engine — 10-criteria scoring (0.0-1.0) per record        ║
// ║    + Legal Description Parser — extracts section/block/lot/survey/subdiv   ║
// ║    + Instrument Type Normalizer — 50+ abbreviation mappings                ║
// ║    + Chain-of-Title Query API — 9 endpoints for title search               ║
// ║    + R2→D1 Backfill Engine — ingest existing R2 JSON into deed_records     ║
// ║    + Ingest Telemetry — real-time metrics, quality distribution            ║
// ║    + County Coverage Stats — completeness %, missing types, date range     ║
// ║    + Autonomous operation — scrape → normalize → score → ingest → serve    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import puppeteer from "@cloudflare/puppeteer";

const VERSION = '9.0.0';
const CODENAME = 'AAAAA — AUTONOMOUS CHAIN-OF-TITLE EDITION';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  MULTI-LLM ROTATOR — Intelligent AI with free model rotation              ║
// ║  Providers: Workers AI (built-in), GitHub Models, Azure Free, OpenRouter   ║
// ║  Auto-rotates on rate limit / error — zero cost, infinite resilience       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const LLM_PROVIDERS = [
  { name: 'workers_ai', model: '@cf/meta/llama-3.1-8b-instruct', type: 'workers_ai' },
  { name: 'github_gpt41nano', model: 'gpt-4.1-nano', type: 'github', endpoint: 'https://models.github.ai/inference/chat/completions' },
  { name: 'github_gpt41mini', model: 'gpt-4.1-mini', type: 'github', endpoint: 'https://models.github.ai/inference/chat/completions' },
  { name: 'github_deepseek_v3', model: 'deepseek-V3-0324', type: 'github', endpoint: 'https://models.github.ai/inference/chat/completions' },
  { name: 'github_llama_scout', model: 'Meta-Llama-4-Scout-17B-16E-Instruct', type: 'github', endpoint: 'https://models.github.ai/inference/chat/completions' },
  { name: 'azure_gpt41', model: 'gpt-4.1', type: 'azure', endpoint: 'https://EchoOMEGAOpenAI.openai.azure.com/openai/deployments/gpt41-eastus/chat/completions', apiVersion: '2024-12-01-preview' },
  { name: 'azure_gpt41mini', model: 'gpt-4.1-mini', type: 'azure', endpoint: 'https://EchoOMEGAOpenAI.openai.azure.com/openai/deployments/gpt41mini-eastus/chat/completions', apiVersion: '2024-12-01-preview' },
  { name: 'openrouter_llama70b', model: 'meta-llama/llama-3.3-70b-instruct:free', type: 'openrouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  { name: 'openrouter_qwen32b', model: 'qwen/qwen3-32b:free', type: 'openrouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  { name: 'groq_llama70b', model: 'llama-3.3-70b-versatile', type: 'groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
  { name: 'groq_llama8b', model: 'llama-3.1-8b-instant', type: 'groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
  { name: 'groq_gemma2', model: 'gemma2-9b-it', type: 'groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
];

let llmRotatorIndex = 0;
const llmFailCounts = {};
const llmLastUsed = {};
const LLM_COOLDOWN_MS = 60000; // 1 min cooldown after rate limit

function getNextLLMProvider() {
  const now = Date.now();
  for (let i = 0; i < LLM_PROVIDERS.length; i++) {
    const idx = (llmRotatorIndex + i) % LLM_PROVIDERS.length;
    const provider = LLM_PROVIDERS[idx];
    const fails = llmFailCounts[provider.name] || 0;
    const lastUsed = llmLastUsed[provider.name] || 0;
    // Skip if recently rate-limited (exponential backoff)
    if (fails > 0 && (now - lastUsed) < LLM_COOLDOWN_MS * Math.min(fails, 5)) continue;
    llmRotatorIndex = (idx + 1) % LLM_PROVIDERS.length;
    return provider;
  }
  // All providers exhausted — reset and try first
  for (const k of Object.keys(llmFailCounts)) llmFailCounts[k] = 0;
  llmRotatorIndex = 0;
  return LLM_PROVIDERS[0];
}

async function callLLM(env, systemPrompt, userPrompt, maxTokens = 500) {
  const maxRetries = LLM_PROVIDERS.length;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const provider = getNextLLMProvider();
    try {
      let result;
      if (provider.type === 'workers_ai') {
        // Built-in Workers AI — no API key needed
        const aiResult = await env.AI.run(provider.model, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
        });
        result = aiResult?.response || '';
      } else if (provider.type === 'github') {
        const key = env.GITHUB_TOKEN;
        if (!key) continue;
        const resp = await fetch(provider.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            max_tokens: maxTokens, temperature: 0.1,
          }),
        });
        if (!resp.ok) {
          if (resp.status === 429 || resp.status === 503) { llmFailCounts[provider.name] = (llmFailCounts[provider.name] || 0) + 1; llmLastUsed[provider.name] = Date.now(); continue; }
          continue;
        }
        const data = await resp.json();
        result = data?.choices?.[0]?.message?.content || '';
      } else if (provider.type === 'azure') {
        const key = env.AZURE_API_KEY;
        if (!key) continue;
        const url = `${provider.endpoint}?api-version=${provider.apiVersion}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': key },
          body: JSON.stringify({
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            max_tokens: maxTokens, temperature: 0.1,
          }),
        });
        if (!resp.ok) {
          if (resp.status === 429 || resp.status === 503) { llmFailCounts[provider.name] = (llmFailCounts[provider.name] || 0) + 1; llmLastUsed[provider.name] = Date.now(); continue; }
          continue;
        }
        const data = await resp.json();
        result = data?.choices?.[0]?.message?.content || '';
      } else if (provider.type === 'openrouter') {
        const key = env.OPENROUTER_KEY;
        if (!key) continue;
        const resp = await fetch(provider.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://echo-op.com', 'X-Title': 'ShadowGlass' },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            max_tokens: maxTokens, temperature: 0.1,
          }),
        });
        if (!resp.ok) {
          if (resp.status === 429 || resp.status === 503) { llmFailCounts[provider.name] = (llmFailCounts[provider.name] || 0) + 1; llmLastUsed[provider.name] = Date.now(); continue; }
          continue;
        }
        const data = await resp.json();
        result = data?.choices?.[0]?.message?.content || '';
      } else if (provider.type === 'groq') {
        const key = env.GROQ_API_KEY || env.GROQ_KEY;
        if (!key) continue;
        const resp = await fetch(provider.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            max_tokens: maxTokens, temperature: 0.1,
          }),
        });
        if (!resp.ok) {
          if (resp.status === 429 || resp.status === 503) { llmFailCounts[provider.name] = (llmFailCounts[provider.name] || 0) + 1; llmLastUsed[provider.name] = Date.now(); continue; }
          continue;
        }
        const data = await resp.json();
        result = data?.choices?.[0]?.message?.content || '';
      }

      if (result && result.length > 2) {
        llmFailCounts[provider.name] = 0; // Reset on success
        return { text: result, provider: provider.name };
      }
    } catch (e) {
      llmFailCounts[provider.name] = (llmFailCounts[provider.name] || 0) + 1;
      llmLastUsed[provider.name] = Date.now();
      console.error(`[LLM-ROTATE] ${provider.name} failed: ${e.message}`);
    }
  }
  return { text: '', provider: 'none' }; // All exhausted — degrade gracefully
}

// LLM-powered legal description parser (falls back to regex if all LLMs down)
async function llmParseLegal(env, legalDesc, county) {
  if (!legalDesc || legalDesc.length < 10 || legalDesc === 'SEE INSTRUMENT') return null;
  const sys = `You extract structured parcel data from Texas/NM legal descriptions. Return ONLY valid JSON, no markdown.`;
  const prompt = `Extract section, block, lot, survey, subdivision, acres from this ${county} county legal description. Return JSON like {"section":"270","block":"13","lot":"1","survey":"H&GN RR","subdivision":"TOYAH VALLEY","acres":"10"}. Omit fields not found.\n\nLegal: ${legalDesc.substring(0, 500)}`;
  const { text, provider } = await callLLM(env, sys, prompt, 200);
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[^}]+\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      parsed._llm_provider = provider;
      return parsed;
    }
  } catch {}
  return null;
}

// LLM-powered entity extraction (grantor/grantee name normalization)
async function llmExtractEntities(env, grantor, grantee, instrumentType) {
  if ((!grantor || grantor.length < 3) && (!grantee || grantee.length < 3)) return null;
  const sys = `You normalize Texas property record party names. Return ONLY valid JSON, no markdown.`;
  const prompt = `Normalize these parties from a ${instrumentType} record. Split multiple parties. Identify entities vs individuals. Return JSON like {"grantors":[{"name":"SMITH JOHN A","type":"individual"}],"grantees":[{"name":"XYZ OIL CO","type":"entity"}]}\n\nGrantor: ${(grantor || '').substring(0, 300)}\nGrantee: ${(grantee || '').substring(0, 300)}`;
  const { text, provider } = await callLLM(env, sys, prompt, 300);
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return null;
}

// LLM-powered instrument type classification (when doc_type_code is ambiguous)
async function llmClassifyInstrument(env, description, docTypeCode, grantor, grantee) {
  const sys = `You classify Texas property instruments. Return ONLY the instrument type name, nothing else.`;
  const types = 'DEED, WARRANTY DEED, MINERAL DEED, OIL AND GAS LEASE, DEED OF TRUST, RELEASE, ASSIGNMENT, EASEMENT, ROYALTY DEED, AFFIDAVIT OF HEIRSHIP, QUIT CLAIM DEED, CONVEYANCE, POOLING AGREEMENT, UNITIZATION ORDER';
  const prompt = `Classify this instrument. Code: ${docTypeCode || 'unknown'}. Grantor: ${(grantor || '').substring(0, 100)}. Grantee: ${(grantee || '').substring(0, 100)}. Description: ${(description || '').substring(0, 200)}.\nValid types: ${types}\nReturn ONLY the type name.`;
  const { text } = await callLLM(env, sys, prompt, 50);
  if (!text) return null;
  const clean = text.trim().toUpperCase().replace(/[^A-Z ]/g, '');
  if (INSTRUMENT_TYPES.includes(clean)) return clean;
  return null;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  DATE-RANGE PARTITIONING — Breaks Kofile 9,500/type pagination ceiling     ║
// ║  When a search returns >9,000 results, split into date-range partitions    ║
// ║  PublicSearch recordedDateRange format: "MM/DD/YYYY,MM/DD/YYYY"            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const DATE_PARTITIONS = [
  { label: '1880-1949', from: '01/01/1880', to: '12/31/1949' },
  { label: '1950-1969', from: '01/01/1950', to: '12/31/1969' },
  { label: '1970-1979', from: '01/01/1970', to: '12/31/1979' },
  { label: '1980-1989', from: '01/01/1980', to: '12/31/1989' },
  { label: '1990-1999', from: '01/01/1990', to: '12/31/1999' },
  { label: '2000-2004', from: '01/01/2000', to: '12/31/2004' },
  { label: '2005-2009', from: '01/01/2005', to: '12/31/2009' },
  { label: '2010-2014', from: '01/01/2010', to: '12/31/2014' },
  { label: '2015-2019', from: '01/01/2015', to: '12/31/2019' },
  { label: '2020-2022', from: '01/01/2020', to: '12/31/2022' },
  { label: '2023-2024', from: '01/01/2023', to: '12/31/2024' },
  { label: '2025-2026', from: '01/01/2025', to: '12/31/2026' },
];

const DATE_PARTITION_THRESHOLD = 9000; // If discovery returns >= this, auto-partition

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  EVASION ENGINE v8 — PORTED FROM v3 OMEGA (120+ TECHNIQUES)                ║
// ║  HTTP-level evasions for Cloudflare Workers (no browser injection needed)   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const EVASION = {
  // 30 User-Agent strings from v3_omega — Chrome/Firefox/Edge/Safari/Opera/Brave/Vivaldi
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/115.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:134.0) Gecko/20100101 Firefox/134.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.2957.127',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:134.0) Gecko/20100101 Firefox/134.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Vivaldi/6.9.3447.54',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.88 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.205 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Brave/1.73',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Vivaldi/7.0',
  ],

  // Accept header permutations from v3_omega — 4 variants
  ACCEPT_SETS: [
    { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      encoding: 'gzip, deflate, br, zstd', lang: 'en-US,en;q=0.9' },
    { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      encoding: 'gzip, deflate, br', lang: 'en-US,en;q=0.9,es;q=0.8' },
    { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      encoding: 'gzip, deflate, br, zstd', lang: 'en-US,en;q=0.5' },
    { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      encoding: 'gzip, deflate, br', lang: 'en-GB,en-US;q=0.9,en;q=0.8' },
  ],

  // Generate Sec-CH-UA matching the UA string — critical for fingerprint consistency
  getSecChUa(ua) {
    if (ua.includes('Chrome/133')) return '"Chromium";v="133", "Google Chrome";v="133", "Not?A_Brand";v="99"';
    if (ua.includes('Chrome/132')) return '"Chromium";v="132", "Google Chrome";v="132", "Not_A Brand";v="24"';
    if (ua.includes('Chrome/131')) return '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"';
    if (ua.includes('Chrome/130')) return '"Chromium";v="130", "Google Chrome";v="130", "Not_A Brand";v="24"';
    const edgVer = ua.match(/Edg\/([\d]+)/);
    if (edgVer) return `"Microsoft Edge";v="${edgVer[1]}", "Chromium";v="${edgVer[1]}", "Not_A Brand";v="24"`;
    if (ua.includes('OPR/')) return '"Opera";v="115", "Chromium";v="129", "Not_A Brand";v="24"';
    if (ua.includes('Brave/')) return '"Brave";v="126", "Chromium";v="126", "Not_A Brand";v="24"';
    if (ua.includes('Vivaldi/')) return '"Vivaldi";v="7", "Chromium";v="131", "Not_A Brand";v="24"';
    return null; // Firefox/Safari don't send Sec-CH-UA
  },

  // Get platform from UA
  getPlatform(ua) {
    if (ua.includes('Macintosh')) return '"macOS"';
    if (ua.includes('Linux')) return '"Linux"';
    if (ua.includes('Windows NT 11')) return '"Windows"';
    return '"Windows"';
  },

  // Connection simulation from v3_omega
  CONNECTIONS: [
    { type: '4g', downlink: '10', rtt: '50' },
    { type: '4g', downlink: '25.5', rtt: '25' },
    { type: 'wifi', downlink: '50', rtt: '50' },
    { type: '4g', downlink: '7.3', rtt: '100' },
    { type: 'wifi', downlink: '100', rtt: '25' },
  ],
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  IDENTITY GENERATOR — Per-request fingerprint with matched headers         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function generateIdentity() {
  const ua = EVASION.USER_AGENTS[Math.floor(Math.random() * EVASION.USER_AGENTS.length)];
  const acceptSet = EVASION.ACCEPT_SETS[Math.floor(Math.random() * EVASION.ACCEPT_SETS.length)];
  const conn = EVASION.CONNECTIONS[Math.floor(Math.random() * EVASION.CONNECTIONS.length)];
  const secChUa = EVASION.getSecChUa(ua);
  const platform = EVASION.getPlatform(ua);
  const isFirefox = ua.includes('Firefox');
  const isSafari = ua.includes('Safari') && !ua.includes('Chrome');
  const isMobile = false;

  // Build complete header set — order matters for TLS fingerprinting
  const headers = {
    'User-Agent': ua,
    'Accept': acceptSet.accept,
    'Accept-Language': acceptSet.lang,
    'Accept-Encoding': acceptSet.encoding,
    'Cache-Control': Math.random() > 0.7 ? 'no-cache' : 'max-age=0',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  // Chromium-only headers (Firefox/Safari don't send these)
  if (secChUa && !isFirefox && !isSafari) {
    headers['Sec-CH-UA'] = secChUa;
    headers['Sec-CH-UA-Mobile'] = isMobile ? '?1' : '?0';
    headers['Sec-CH-UA-Platform'] = platform;
    headers['Sec-Fetch-Dest'] = 'document';
    headers['Sec-Fetch-Mode'] = 'navigate';
    headers['Sec-Fetch-Site'] = 'none';
    headers['Sec-Fetch-User'] = '?1';
  }

  // DNT (randomized like v3_omega)
  if (Math.random() > 0.6) {
    headers['DNT'] = '1';
  }

  return { ua, headers, conn, isFirefox, isSafari, secChUa };
}

// Generate AJAX-specific headers (for POST requests, XHR calls)
function generateAjaxHeaders(identity, origin, referer) {
  const h = { ...identity.headers };
  h['Accept'] = 'application/json, text/javascript, */*; q=0.01';
  h['X-Requested-With'] = 'XMLHttpRequest';
  if (origin) h['Origin'] = origin;
  if (referer) h['Referer'] = referer;
  // Update Sec-Fetch for AJAX
  if (identity.secChUa && !identity.isFirefox && !identity.isSafari) {
    h['Sec-Fetch-Dest'] = 'empty';
    h['Sec-Fetch-Mode'] = 'cors';
    h['Sec-Fetch-Site'] = 'same-origin';
    delete h['Sec-Fetch-User'];
  }
  return h;
}

// Generate form POST headers
function generateFormHeaders(identity, origin, referer) {
  const h = { ...identity.headers };
  h['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
  h['X-Requested-With'] = 'XMLHttpRequest';
  h['Accept'] = 'application/json, text/javascript, */*; q=0.01';
  if (origin) h['Origin'] = origin;
  if (referer) h['Referer'] = referer;
  if (identity.secChUa && !identity.isFirefox && !identity.isSafari) {
    h['Sec-Fetch-Dest'] = 'empty';
    h['Sec-Fetch-Mode'] = 'cors';
    h['Sec-Fetch-Site'] = 'same-origin';
    delete h['Sec-Fetch-User'];
  }
  return h;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PROXY ROUTER — Difficulty-based routing from system prompt architecture   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const DIFFICULTY = { DIRECT: 0, TUNNEL: 1, RESIDENTIAL: 2 };

// Target difficulty classification
const TARGET_DIFFICULTY = {
  'tylerhost.net':     DIFFICULTY.DIRECT,     // Tyler Tech — minimal protection
  'publicrecords.net': DIFFICULTY.DIRECT,      // Simple county sites
  'publicsearch.us':   DIFFICULTY.TUNNEL,      // Needs relay/tunnel
  'texasfile.com':     DIFFICULTY.RESIDENTIAL, // Aggressive bot detection
  'default':           DIFFICULTY.TUNNEL,
};

function classifyTarget(url) {
  try {
    const hostname = new URL(url).hostname;
    for (const [domain, diff] of Object.entries(TARGET_DIFFICULTY)) {
      if (domain !== 'default' && hostname.includes(domain)) return diff;
    }
  } catch {}
  return TARGET_DIFFICULTY.default;
}

async function fetchWithProxy(url, options, env) {
  const difficulty = classifyTarget(url);

  // Strip Accept-Encoding from outgoing headers — Workers fetch() handles decompression
  // transparently. Sending explicit Accept-Encoding can cause double-encoding issues
  // where the response body arrives compressed but .text() doesn't auto-decompress.
  if (options?.headers) {
    const cleaned = { ...options.headers };
    delete cleaned['Accept-Encoding'];
    options = { ...options, headers: cleaned };
  }

  // DIRECT — bare fetch (Tyler Tech, simple sites)
  if (difficulty === DIFFICULTY.DIRECT) {
    return fetch(url, options);
  }

  // TUNNEL — route through RELAY_URL (Prometheus tunnel)
  if (difficulty === DIFFICULTY.TUNNEL && env.RELAY_URL) {
    return fetch(`${env.RELAY_URL}/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ShadowGlass': 'v8.0' },
      body: JSON.stringify({ url, method: options.method || 'GET', headers: options.headers, body: options.body }),
    });
  }

  // RESIDENTIAL — route through residential proxy (if configured)
  if (difficulty === DIFFICULTY.RESIDENTIAL && env.RESIDENTIAL_PROXY_URL) {
    return fetch(url, {
      ...options,
      // CF Workers support custom fetch via service bindings — residential proxy acts as gateway
      headers: { ...options.headers, 'X-Proxy-Auth': env.RESIDENTIAL_PROXY_KEY || '' },
    });
  }

  // Fallback: direct fetch
  return fetch(url, options);
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  CIRCUIT BREAKER — From v3_omega, per-county auto-pause on failures        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const circuitBreakers = new Map();

class CircuitBreaker {
  constructor(name, threshold = 10, timeout = 60000) {
    this.name = name;
    this.threshold = threshold;
    this.timeout = timeout;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.lastFailure = 0;
    this.successes = 0;
  }

  canProceed() {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true; // HALF_OPEN — allow one test request
  }

  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= 3) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
      }
    } else {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    this.successes = 0;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.log(`[CIRCUIT] ${this.name} OPEN — ${this.failures} failures, pausing ${this.timeout/1000}s`);
    }
  }
}

function getCircuitBreaker(name) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name));
  }
  return circuitBreakers.get(name);
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  RETRY ENGINE — Exponential backoff with jitter from v3_omega              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function fetchWithRetry(url, options, env, { maxRetries = 5, baseDelay = 1500, maxDelay = 30000, circuitName = 'default' } = {}) {
  const cb = getCircuitBreaker(circuitName);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (!cb.canProceed()) {
      throw new Error(`Circuit breaker OPEN for ${circuitName} — backing off`);
    }

    try {
      const resp = await fetchWithProxy(url, options, env);

      if (resp.ok) {
        cb.recordSuccess();
        return resp;
      }

      // Rate limited or server error — retry
      if (resp.status === 429 || resp.status === 503 || resp.status === 502 || resp.status === 500) {
        cb.recordFailure();
        if (attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(1.5, attempt), maxDelay);
          const jitter = delay * (0.5 + Math.random());
          console.log(`[RETRY] ${circuitName} HTTP ${resp.status}, attempt ${attempt+1}/${maxRetries}, waiting ${Math.round(jitter)}ms`);
          await sleep(jitter);
          continue;
        }
      }

      // 403/401 — proxy escalation
      if (resp.status === 403 || resp.status === 401) {
        cb.recordFailure();
        console.log(`[RETRY] ${circuitName} HTTP ${resp.status} — access denied, attempt ${attempt+1}`);
        if (attempt < maxRetries) {
          await sleep(baseDelay * Math.pow(2, attempt) * (0.5 + Math.random()));
          continue;
        }
      }

      return resp; // Return non-retryable error response

    } catch (err) {
      cb.recordFailure();
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(1.5, attempt), maxDelay);
        const jitter = delay * (0.5 + Math.random());
        console.log(`[RETRY] ${circuitName} error: ${err.message}, attempt ${attempt+1}/${maxRetries}, waiting ${Math.round(jitter)}ms`);
        await sleep(jitter);
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Max retries (${maxRetries}) exceeded for ${circuitName}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Human-like delay from v3_omega HumanSimulator
function humanDelay(minMs = 200, maxMs = 800) {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TYLER TECH COUNTY REGISTRY — 19 verified from v7 WarpSpeed               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const TYLER_COUNTIES = {
  // Original 7 verified
  burnet:       { subdomain: 'burnet',          docsearch: 'DOCSEARCH144S1' },
  ector:        { subdomain: 'ectorcounty',     docsearch: 'DOCSEARCH144S1' },
  liberty:      { subdomain: 'liberty',         docsearch: 'DOCSEARCH144S1' },
  navarro:      { subdomain: 'navarro',         docsearch: 'DOCSEARCH144S1' },
  orange:       { subdomain: 'orange',          docsearch: 'DOCSEARCH144S1' },
  polk:         { subdomain: 'polk',            docsearch: 'DOCSEARCH144S1' },
  taylor:       { subdomain: 'taylor',          docsearch: 'DOCSEARCH144S1' },
  // 12 newly discovered (2026-02-07)
  calhoun:      { subdomain: 'calhouncounty',   docsearch: 'DOCSEARCH144S1' },
  erath:        { subdomain: 'erathcounty',     docsearch: 'DOCSEARCH144S1' },
  henderson:    { subdomain: 'hendersoncounty', docsearch: 'DOCSEARCH144S1' },
  hood:         { subdomain: 'hoodcounty',      docsearch: 'DOCSEARCH144S1' },
  hunt:         { subdomain: 'huntcounty',      docsearch: 'DOCSEARCH144S1' },
  kaufman:      { subdomain: 'kaufmancounty',   docsearch: 'DOCSEARCH144S1' },
  lamar:        { subdomain: 'lamarcounty',     docsearch: 'DOCSEARCH144S1' },
  mclennan:     { subdomain: 'mclennancounty',  docsearch: 'DOCSEARCH144S1' },
  parker:       { subdomain: 'parkercounty',    docsearch: 'DOCSEARCH144S1' },
  randall:      { subdomain: 'randallcounty',   docsearch: 'DOCSEARCH144S1' },
  upshur:       { subdomain: 'upshurcounty',    docsearch: 'DOCSEARCH144S1' },
  wise:         { subdomain: 'wisecounty',      docsearch: 'DOCSEARCH144S1' },
};

function getTylerBaseUrl(countyKey) {
  const county = TYLER_COUNTIES[countyKey.toLowerCase()];
  if (!county) return null;
  return `https://${county.subdomain}tx-web.tylerhost.net`;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TYLER ODYSSEY PORTAL REGISTRY — Court Case Records (criminal/civil/family)║
// ║  NEW in v9.1: Criminal warrants, affidavits, orders, judgments             ║
// ║  These are DIFFERENT from Tyler Recorder (deed records above)              ║
// ║  Odyssey = case management / Recorder = county clerk land records          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const ODYSSEY_PORTALS = {
  midland:    { url: 'https://portal.mcounty.com/Portal',          name: 'Midland County',   state: 'TX', courts: ['441st District', '238th District', '318th District', 'County Court at Law 1', 'County Court at Law 2'] },
  ector:      { url: 'https://portal.epcounty.com/Portal',         name: 'Ector County',     state: 'TX', courts: ['161st District', '244th District', '358th District', '70th District'] },
  lubbock:    { url: 'https://portal.lubbockcounty.gov/Portal',    name: 'Lubbock County',   state: 'TX', courts: ['72nd District', '99th District', '137th District', '140th District'] },
  tarrant:    { url: 'https://odysseyportal.tarrantcounty.com/Portal', name: 'Tarrant County', state: 'TX', courts: [] },
  harris:     { url: 'https://www.cclerk.hctx.net/Applications/WebSearch/CourtSearch.aspx', name: 'Harris County', state: 'TX', courts: [] },
  dallas:     { url: 'https://www.dallascounty.org/services/online-services.php', name: 'Dallas County', state: 'TX', courts: [] },
  bexar:      { url: 'https://portal.bexar.org/Portal',            name: 'Bexar County',     state: 'TX', courts: [] },
  travis:     { url: 'https://odysseyportal.traviscountytx.gov/Portal', name: 'Travis County', state: 'TX', courts: [] },
  taylor:     { url: 'https://portal.taylorcountytexas.org/Portal', name: 'Taylor County',   state: 'TX', courts: ['42nd District', '104th District', '350th District'] },
  tom_green:  { url: 'https://portal.co.tom-green.tx.us/Portal',   name: 'Tom Green County', state: 'TX', courts: ['51st District', '119th District', '340th District'] },
};

const ODYSSEY_CASE_TYPES = [
  'CRIMINAL', 'CIVIL', 'FAMILY', 'JUVENILE', 'PROBATE', 'TAX',
  'WARRANT', 'PROTECTIVE_ORDER', 'BOND', 'APPEAL',
];

const ODYSSEY_DOCUMENT_TYPES = [
  'WARRANT', 'AFFIDAVIT', 'INDICTMENT', 'COMPLAINT', 'INFORMATION',
  'ORDER', 'JUDGMENT', 'MOTION', 'PLEA', 'BOND', 'DOCKET_SHEET',
  'RETURN_OF_SERVICE', 'SUBPOENA', 'NOTICE', 'RULING',
];

function getOdysseyPortal(countyKey) {
  const key = countyKey.toLowerCase().replace(/\s+/g, '_');
  return ODYSSEY_PORTALS[key] || null;
}

// Odyssey portal login — uses stored credentials from KV
async function odysseyLogin(page, portalUrl, env) {
  // Tyler Odyssey portals use Tyler IDP (Identity Provider) for authentication.
  // The login flow: portal/Account/Login → redirects to odysseyidentityprovider.tylerhost.net
  // IDP form fields: #UserName (email), #Password, #TOSCheckBox (Terms of Service)
  // After login: redirects back to portal with auth cookies
  const creds = await env.DEDUP_KV.get('odyssey_creds', { type: 'json' });
  if (!creds?.email || !creds?.password) {
    console.log(`[ODYSSEY-AUTH] No credentials stored. Set via: POST /odyssey/credentials {email, password}`);
    return false;
  }

  try {
    // Navigate to login — this redirects to Tyler IDP (tylerhost.net)
    console.log(`[ODYSSEY-AUTH] Navigating to ${portalUrl}/Account/Login`);
    await page.goto(`${portalUrl}/Account/Login`, { waitUntil: 'networkidle0', timeout: 45000 });
    await page.waitForTimeout(3000);

    const loginUrl = page.url();
    console.log(`[ODYSSEY-AUTH] Redirected to: ${loginUrl}`);

    // Dismiss any session timeout or Amazon WAF dialogs
    try { await page.evaluate(() => { const b = document.getElementById('timeoutContinueBtn'); if (b) b.click(); }); } catch {}
    try {
      const captchaBtn = await page.$('#amzn-captcha-verify-button');
      if (captchaBtn) {
        console.log(`[ODYSSEY-AUTH] WARNING: Amazon WAF CAPTCHA detected — cannot auto-solve`);
        return false;
      }
    } catch {}
    await page.waitForTimeout(1000);

    // Tyler IDP login form: #UserName (email/username), #Password, #TOSCheckBox
    const userSelectors = ['#UserName', 'input[name="UserName"]', '#Email', 'input[name="Email"]', 'input[type="email"]', 'input[name="username"]', '#Logon', 'input[name="Logon"]'];
    let userInput = null;
    for (const sel of userSelectors) {
      userInput = await page.$(sel);
      if (userInput) {
        console.log(`[ODYSSEY-AUTH] Found username field: ${sel}`);
        break;
      }
    }

    const pwdSelectors = ['#Password', 'input[name="Password"]', 'input[type="password"]'];
    let pwdInput = null;
    for (const sel of pwdSelectors) {
      pwdInput = await page.$(sel);
      if (pwdInput) {
        console.log(`[ODYSSEY-AUTH] Found password field: ${sel}`);
        break;
      }
    }

    if (!userInput || !pwdInput) {
      console.log(`[ODYSSEY-AUTH] Login form fields not found on: ${loginUrl}`);
      return false;
    }

    // Fill credentials
    await userInput.click({ clickCount: 3 });
    await userInput.type(creds.email, { delay: 30 });
    await pwdInput.click({ clickCount: 3 });
    await pwdInput.type(creds.password, { delay: 30 });

    // Check TOS checkbox if present (Tyler IDP requires it)
    const tosCheck = await page.$('#TOSCheckBox');
    if (tosCheck) {
      const isChecked = await page.evaluate(el => el.checked, tosCheck);
      if (!isChecked) {
        await tosCheck.click();
        console.log(`[ODYSSEY-AUTH] Checked TOS checkbox`);
      }
    }

    // Submit — Tyler IDP uses button[type="submit"] or text "Sign In"
    let submitBtn = await page.$('button[type="submit"], input[type="submit"]');
    if (!submitBtn) {
      submitBtn = await page.$('button.btn-primary, #loginBtn, .login-submit');
    }
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for redirect back to portal (IDP → portal with auth cookies)
    await page.waitForTimeout(5000);
    try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }); } catch {}

    const afterUrl = page.url();
    const isLoggedIn = afterUrl.includes('portal') || afterUrl.includes('Portal') || (!afterUrl.includes('signin') && !afterUrl.includes('Account/Login'));
    console.log(`[ODYSSEY-AUTH] Login ${isLoggedIn ? 'SUCCESS' : 'FAILED'} — URL: ${afterUrl}`);
    return isLoggedIn;

  } catch (e) {
    console.error(`[ODYSSEY-AUTH] Login error: ${e.message}`);
    return false;
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  COOKIE MANAGER — From deployed v5 worker                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function extractCookies(response) {
  const cookies = [];
  try {
    const setCookies = response.headers.getSetCookie?.();
    if (setCookies && Array.isArray(setCookies)) {
      for (const sc of setCookies) {
        const nameVal = sc.split(';')[0].trim();
        if (nameVal.includes('=')) cookies.push(nameVal);
      }
      if (cookies.length > 0) return cookies;
    }
  } catch {}
  const raw = response.headers.get('set-cookie');
  if (raw) {
    for (const part of raw.split(/,(?=\s*\w+=)/)) {
      const nameVal = part.trim().split(';')[0];
      if (nameVal.includes('=')) cookies.push(nameVal);
    }
  }
  return cookies;
}

function mergeCookies(existing, incoming) {
  const map = new Map();
  for (const c of [...existing, ...incoming]) {
    const [name] = c.split('=', 1);
    map.set(name, c);
  }
  return Array.from(map.values());
}

function cookieHeader(cookies) { return cookies.join('; '); }

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#149;/g, '•').replace(/\s+/g, ' ').trim();
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TYLER TECH SCRAPER v8 — Enhanced with evasion + retry + circuit breaker   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function setupTylerSession(baseUrl, env) {
  const identity = generateIdentity();
  let cookies = [];
  const origin = new URL(baseUrl).origin;
  const basePath = baseUrl.includes('/recorder/') ? '/recorder/web' : '/web';
  const circuitName = `tyler:${new URL(baseUrl).hostname}`;

  const navHeaders = (extra = {}) => ({
    ...identity.headers,
    Cookie: cookieHeader(cookies),
    ...extra,
  });
  const ajaxH = (extra = {}) => generateAjaxHeaders(identity, origin, `${origin}${basePath}/user/disclaimer`);

  // Step 1: GET disclaimer
  const r1 = await fetchWithRetry(`${origin}${basePath}/user/disclaimer`, {
    headers: navHeaders(), redirect: 'follow',
  }, env, { circuitName, maxRetries: 3 });
  cookies = mergeCookies(cookies, extractCookies(r1));
  await r1.text();

  // Step 2: POST accept disclaimer
  const r2 = await fetchWithRetry(`${origin}${basePath}/user/disclaimer`, {
    method: 'POST',
    headers: { ...ajaxH(), Cookie: cookieHeader(cookies), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'ajaxRequest=true',
    redirect: 'follow',
  }, env, { circuitName, maxRetries: 3 });
  cookies = mergeCookies(cookies, extractCookies(r2));
  await r2.text();

  // Step 3: GET home
  const r3 = await fetchWithRetry(`${origin}${basePath}/`, {
    headers: { ...navHeaders(), Cookie: cookieHeader(cookies) }, redirect: 'follow',
  }, env, { circuitName, maxRetries: 3 });
  cookies = mergeCookies(cookies, extractCookies(r3));
  await r3.text();

  // Step 4: POST homeActions — discover menu
  const r4 = await fetchWithRetry(`${origin}${basePath}/homeActions`, {
    method: 'POST',
    headers: { ...ajaxH(), Cookie: cookieHeader(cookies), Accept: 'text/html, */*; q=0.01' },
    redirect: 'follow',
  }, env, { circuitName, maxRetries: 3 });
  cookies = mergeCookies(cookies, extractCookies(r4));
  const menuHtml = await r4.text();

  // v9.1: Try ACTIONGROUP first, but some counties put DOCSEARCH directly in menu
  const actionMatch = menuHtml.match(/href="([^"]*\/action\/ACTIONGROUP\d+S\d+)"/i);
  let searchMatch;
  if (actionMatch) {
    // Step 5: GET action group
    await humanDelay(300, 800);
    const r5 = await fetchWithRetry(`${origin}${actionMatch[1]}`, {
      headers: { ...navHeaders(), Cookie: cookieHeader(cookies) }, redirect: 'follow',
    }, env, { circuitName, maxRetries: 3 });
    cookies = mergeCookies(cookies, extractCookies(r5));
    const actionHtml = await r5.text();
    searchMatch = actionHtml.match(/href="[^"]*\/search\/(DOCSEARCH\d+S\d+)"/i);
    if (!searchMatch) throw new Error(`No DOCSEARCH in Tyler action page: ${actionHtml.slice(0, 300)}`);
  } else {
    // Fallback: look for DOCSEARCH directly in menu HTML (some counties skip ACTIONGROUP)
    searchMatch = menuHtml.match(/href="[^"]*\/search\/(DOCSEARCH\d+S\d+)"/i);
    if (!searchMatch) throw new Error(`No action group or DOCSEARCH in Tyler menu: ${menuHtml.slice(0, 300)}`);
    console.log(`[TYLER] Found DOCSEARCH directly in menu (no ACTIONGROUP): ${searchMatch[1]}`);
  }
  const searchActionId = searchMatch[1];

  // Step 6: GET search form — init JSF state
  await humanDelay(200, 500);
  const r6 = await fetchWithRetry(`${origin}${basePath}/search/${searchActionId}`, {
    headers: { ...navHeaders(), Cookie: cookieHeader(cookies) }, redirect: 'follow',
  }, env, { circuitName, maxRetries: 3 });
  cookies = mergeCookies(cookies, extractCookies(r6));
  await r6.text();

  return { cookies, searchActionId, basePath, origin, identity, circuitName };
}

// Tyler Tech: Submit search with evasion headers
async function tylerSubmitSearch(session, docType, dateStart, dateEnd, env) {
  const searchPostUrl = `${session.origin}${session.basePath}/searchPost/${session.searchActionId}`;
  const referer = `${session.origin}${session.basePath}/search/${session.searchActionId}`;

  const params = new URLSearchParams();
  params.set('field_BothNamesID', '');
  params.set('field_GrantorID', '');
  params.set('field_GranteeID', '');
  params.set('field_RecordingDateID_DOT_StartDate', dateStart);
  params.set('field_RecordingDateID_DOT_EndDate', dateEnd);
  params.set('field_DocumentNumberID', '');
  params.set('field_BookPageID_DOT_Book', '');
  params.set('field_BookPageID_DOT_Volume', '');
  params.set('field_BookPageID_DOT_Page', '');
  params.set('field_PlattedLegalID_DOT_Subdivision', '');
  params.set('field_PlattedLegalID_DOT_Lot', '');
  params.set('field_PlattedLegalID_DOT_Block', '');
  params.set('field_PlattedLegalID_DOT_Tract', '');
  params.set('field_PlattedLegalID_DOT_Unit', '');
  params.set('field_selfservice_documentTypes', docType || '');

  await humanDelay(300, 700);
  const resp = await fetchWithRetry(searchPostUrl, {
    method: 'POST',
    headers: { ...generateFormHeaders(session.identity, session.origin, referer), Cookie: cookieHeader(session.cookies) },
    body: params.toString(),
    redirect: 'follow',
  }, env, { circuitName: session.circuitName, maxRetries: 3 });

  session.cookies = mergeCookies(session.cookies, extractCookies(resp));
  if (!resp.ok) throw new Error(`Tyler searchPost failed: HTTP ${resp.status}`);
  return resp.json();
}

// Tyler Tech: Fetch results page with evasion headers + retry
async function tylerFetchResultsPage(session, page, env) {
  const resultsUrl = `${session.origin}${session.basePath}/searchResults/${session.searchActionId}?page=${page}`;
  const referer = `${session.origin}${session.basePath}/search/${session.searchActionId}`;

  await humanDelay(400, 1200);
  const resp = await fetchWithRetry(resultsUrl, {
    headers: {
      ...generateAjaxHeaders(session.identity, session.origin, referer),
      Cookie: cookieHeader(session.cookies),
      Accept: 'text/html, */*; q=0.01',
    },
    redirect: 'follow',
  }, env, { circuitName: session.circuitName, maxRetries: 3 });

  session.cookies = mergeCookies(session.cookies, extractCookies(resp));
  if (!resp.ok) throw new Error(`Tyler results page ${page} failed: HTTP ${resp.status}`);
  return resp.text();
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  WARPSPEED CSV EXPORT — From v7, raw HTTP CSV download in single request   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function tylerExportCSV(session, env) {
  const csvUrl = `${session.origin}${session.basePath}/viewSearchResultsReport/${session.searchActionId}/CSV`;

  await humanDelay(200, 500);
  const resp = await fetchWithRetry(csvUrl, {
    headers: {
      ...session.identity.headers,
      Cookie: cookieHeader(session.cookies),
      Accept: 'text/csv,application/csv,text/plain,*/*',
    },
    redirect: 'follow',
  }, env, { circuitName: session.circuitName, maxRetries: 3 });

  if (!resp.ok) {
    console.log(`[WARPSPEED] CSV export failed: HTTP ${resp.status}`);
    return null;
  }

  const csv = await resp.text();
  // v9.1: Validate response is actually CSV, not HTML (session expired redirect)
  const trimmed = csv.trimStart();
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML') || trimmed.startsWith('<?xml')) {
    console.log(`[WARPSPEED] CSV export returned HTML instead of CSV (session expired?). Falling back to HTML scrape.`);
    return null;
  }
  const rows = csv.split('\n').length - 1;
  console.log(`[WARPSPEED] CSV export: ${rows} rows, ${(csv.length / 1024).toFixed(1)} KB`);
  return csv;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TYLER CSV PARSER — Converts Tyler Tech CSV export into deed records        ║
// ║  Headers: Instrument Number, Book Page, Description, Recording Date,        ║
// ║           Grantor, Grantee, Legal Description                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function parseTylerCSV(csv, county, instrumentType) {
  if (!csv || csv.length < 50) return [];
  const lines = csv.split('\n');
  if (lines.length < 3) return []; // need header line + at least 1 data line (line 0 is title)

  // Find the header row (usually line 1, but skip any title/preamble rows)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].includes('Instrument Number') || lines[i].includes('"Instrument Number"')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    console.log(`[TYLER-CSV] No header row found, attempting positional parse`);
    headerIdx = 1; // fallback: assume line 1 is header
  }

  // Parse CSV header
  const headerLine = lines[headerIdx];
  const headers = parseCSVRow(headerLine).map(h => h.toLowerCase().trim());

  // Map column indices
  const colMap = {
    instrumentNumber: headers.findIndex(h => h.includes('instrument number') || h.includes('instrument #')),
    bookPage: headers.findIndex(h => h.includes('book page') || h.includes('book/page') || h.includes('book vol')),
    description: headers.findIndex(h => h.includes('description') || h.includes('doc type') || h.includes('instrument type')),
    recordingDate: headers.findIndex(h => h.includes('recording date') || h.includes('recorded date') || h.includes('filing date')),
    grantor: headers.findIndex(h => h.includes('grantor') || h.includes('from')),
    grantee: headers.findIndex(h => h.includes('grantee') || h.includes('to')),
    legalDescription: headers.findIndex(h => h.includes('legal') || h.includes('property')),
  };

  const records = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 5) continue;

    const fields = parseCSVRow(line);
    if (fields.length < 3) continue;

    const instNum = colMap.instrumentNumber >= 0 ? (fields[colMap.instrumentNumber] || '').trim() : '';
    const bookPage = colMap.bookPage >= 0 ? (fields[colMap.bookPage] || '').trim() : '';
    const desc = colMap.description >= 0 ? (fields[colMap.description] || '').trim() : '';
    const recDate = colMap.recordingDate >= 0 ? (fields[colMap.recordingDate] || '').trim() : '';
    const grantor = colMap.grantor >= 0 ? (fields[colMap.grantor] || '').trim() : '';
    const grantee = colMap.grantee >= 0 ? (fields[colMap.grantee] || '').trim() : '';
    const legalDesc = colMap.legalDescription >= 0 ? (fields[colMap.legalDescription] || '').trim() : '';

    // Skip empty rows
    if (!instNum && !grantor && !grantee) continue;

    // Use instrument number as doc_id (it's unique per record in Tyler)
    const docId = instNum || `tyler_${county}_${i}_${Date.now()}`;

    records.push({
      id: docId,
      instrumentType: desc || instrumentType,
      filingDate: recDate,
      recordedDate: recDate,
      grantor: grantor,
      grantee: grantee,
      legalDescription: legalDesc,
      bookPage: bookPage,
      consideration: '',
      pdfUrl: '',
    });
  }

  console.log(`[TYLER-CSV] Parsed ${records.length} records from ${lines.length} CSV lines for ${county}/${instrumentType}`);
  return records;
}

// Parse a single CSV row handling quoted fields with commas inside
function parseCSVRow(line) {
  const fields = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// WarpSpeed: Full scrape for a county using CSV export (no pagination needed)
async function warpSpeedScrape(countyName, dateStart, dateEnd, env) {
  const key = countyName.toLowerCase().replace(/\s+/g, '');
  const tylerInfo = TYLER_COUNTIES[key];

  // Try built-in registry first, then fall back to D1
  let baseUrl;
  if (tylerInfo) {
    baseUrl = `https://${tylerInfo.subdomain}tx-web.tylerhost.net`;
  } else {
    const row = await env.DB.prepare(
      "SELECT base_url FROM counties WHERE UPPER(name) = UPPER(?) AND platform = 'TYLER_TECH'"
    ).bind(countyName.toUpperCase()).first();
    if (!row) return { ok: false, error: `County "${countyName}" not in Tyler Tech registry` };
    baseUrl = row.base_url;
  }

  console.log(`[WARPSPEED] ${countyName}: ${dateStart} → ${dateEnd} via ${baseUrl}`);
  const t0 = Date.now();

  const session = await setupTylerSession(baseUrl, env);
  const searchResult = await tylerSubmitSearch(session, '', dateStart, dateEnd, env);
  const totalPages = searchResult.totalPages || 0;

  if (totalPages === 0) {
    return { ok: true, county: countyName, records: 0, csv: null, elapsed: Date.now() - t0 };
  }

  // CSV export — entire result set in ONE request
  const csv = await tylerExportCSV(session, env);

  const elapsed = Date.now() - t0;
  const rows = csv ? csv.split('\n').length - 1 : 0;

  // Upload CSV to R2 if available
  if (csv && env.R2_RECORDS) {
    const safeDate = dateStart.replace(/\//g, '-');
    const r2Key = `WARPSPEED/${countyName.toUpperCase()}/${safeDate}_${dateEnd.replace(/\//g, '-')}.csv`;
    await env.R2_RECORDS.put(r2Key, csv, {
      httpMetadata: { contentType: 'text/csv' },
      customMetadata: { county: countyName, dateStart, dateEnd, records: String(rows), scrapedAt: new Date().toISOString() },
    });
    console.log(`[WARPSPEED] R2 uploaded: ${r2Key} (${rows} rows)`);
  }

  return { ok: true, county: countyName, records: rows, csvSize: csv?.length || 0, elapsed, totalPages };
}

// WarpSpeed: Multi-county parallel scrape
async function warpSpeedMulti(counties, dateStart, dateEnd, env) {
  const results = {};
  const tasks = counties.map(async (name) => {
    try {
      results[name] = await warpSpeedScrape(name, dateStart, dateEnd, env);
    } catch (err) {
      results[name] = { ok: false, error: err.message };
    }
  });
  await Promise.allSettled(tasks);
  const totalRecords = Object.values(results).reduce((sum, r) => sum + (r.records || 0), 0);
  return { ok: true, totalRecords, counties: results };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TYLER RESULTS PARSER — From deployed v5 worker                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function parseTylerResults(html) {
  const records = [];
  const rowPattern = /<li[^>]*class="[^"]*ss-search-row[^"]*"[^>]*data-documentid="([^"]*)"[^>]*>/gi;
  const matches = [];
  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    matches.push({ docId: match[1], startIdx: match.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].startIdx;
    const endIdx = i + 1 < matches.length ? matches[i + 1].startIdx : html.length;
    const rowHtml = html.slice(startIdx, endIdx);
    const docId = matches[i].docId;
    const h1Match = rowHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    let instrumentNum = '', docType = '';
    if (h1Match) {
      const h1Text = stripHtml(h1Match[1]);
      const bulletIdx = h1Text.indexOf('•');
      if (bulletIdx > 0) { instrumentNum = h1Text.slice(0, bulletIdx).trim(); docType = h1Text.slice(bulletIdx + 1).trim(); }
      else instrumentNum = h1Text.trim();
    }
    const fields = {};
    const columnRegex = /<div[^>]*class="[^"]*searchResultFourColumn[^"]*"[^>]*>([\s\S]*?)<\/div>\s*/gi;
    let colMatch;
    while ((colMatch = columnRegex.exec(rowHtml)) !== null) {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const lis = [];
      let liMatch;
      while ((liMatch = liRegex.exec(colMatch[1])) !== null) lis.push(stripHtml(liMatch[1]));
      if (lis.length >= 2) fields[lis[0].toLowerCase().replace(/\s+/g, ' ').trim()] = lis[1].trim();
    }
    const recordingDate = fields['recording date'] || '';
    const grantor = fields['grantor'] || '';
    const grantee = fields['grantee'] || '';
    const legalDesc = fields['legal description'] || fields['legal'] || '';
    const bookVolPage = fields['book/vol/page'] || fields['book vol page'] || '';
    if (!instrumentNum && !grantor && !recordingDate) continue;
    const linkMatch = rowHtml.match(/href="([^"]*\/document\/[^"]*)"/i);
    records.push({
      id: instrumentNum || docId || `tyler_${i}_${Date.now()}`,
      instrumentType: docType, filingDate: recordingDate, recordedDate: recordingDate,
      grantor, grantee, legalDescription: legalDesc, bookPage: bookVolPage,
      consideration: '', pdfUrl: linkMatch ? linkMatch[1] : '',
    });
  }
  return records;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TYLER BATCH SCRAPER — From v5 with v8 evasion + WarpSpeed CSV            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function fmtDate(d) { return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`; }
const TYLER_CHUNK_DAYS = 90;

function generateDateChunks(startYear = 2000) {
  const chunks = [];
  let chunkEnd = new Date();
  while (chunkEnd.getFullYear() >= startYear) {
    const chunkStart = new Date(chunkEnd.getTime() - TYLER_CHUNK_DAYS * 86400000);
    const effectiveStart = chunkStart.getFullYear() < startYear ? new Date(startYear, 0, 1) : chunkStart;
    chunks.push({ start: fmtDate(effectiveStart), end: fmtDate(chunkEnd), label: `${fmtDate(effectiveStart)}_${fmtDate(chunkEnd)}` });
    chunkEnd = new Date(effectiveStart.getTime() - 86400000);
    if (chunkEnd.getFullYear() < startYear) break;
  }
  return chunks;
}

async function scrapeTylerBatch(env, msg) {
  const results = [];
  const pendingUploads = [];
  const chunkIndex = msg.startPage;
  const chunks = generateDateChunks();
  if (chunkIndex >= chunks.length) return results;
  const chunk = chunks[chunkIndex];
  console.log(`[TYLER v8] county=${msg.county} type=${msg.instrumentType} chunk=${chunkIndex}/${chunks.length} dates=${chunk.start}-${chunk.end}`);

  const session = await setupTylerSession(msg.baseUrl, env);
  const searchResult = await tylerSubmitSearch(session, msg.instrumentType, chunk.start, chunk.end, env);
  const totalPages = searchResult.totalPages || 0;
  if (totalPages === 0) { await updateTylerCheckpoint(env, msg, 0, 0, chunkIndex); return results; }

  // Try WarpSpeed CSV first — one request for ALL results
  const csv = await tylerExportCSV(session, env);
  if (csv && csv.length > 100) {
    const rows = csv.split('\n').length - 1;
    console.log(`[TYLER v8] WarpSpeed CSV: ${rows} rows in single request`);
    const r2Key = `ENCORE/TYLER/${msg.county}/${msg.instrumentType.replace(/ /g,'_')}/csv_chunk_${String(chunkIndex).padStart(4,'0')}.csv`;
    await env.R2_RECORDS.put(r2Key, csv, {
      httpMetadata: { contentType: 'text/csv' },
      customMetadata: { county: msg.county, instrumentType: msg.instrumentType, platform: 'TYLER_TECH', chunk: String(chunkIndex), rows: String(rows), scrapedAt: new Date().toISOString() },
    });
    await updateTylerCheckpoint(env, msg, rows, totalPages * 100, chunkIndex);

    // Parse CSV into individual deed records instead of creating stub
    const parsedRecords = parseTylerCSV(csv, msg.county, msg.instrumentType);
    if (parsedRecords.length > 0) {
      // Split into pages of 100 for D1 batch ingestion
      const pageResults = [];
      for (let p = 0; p < parsedRecords.length; p += 100) {
        const pageSlice = parsedRecords.slice(p, p + 100);
        pageResults.push({
          county: msg.county, instrumentType: msg.instrumentType,
          page: chunkIndex * 1000 + Math.floor(p / 100),
          records: pageSlice, totalFound: pageSlice.length,
          domTotal: totalPages * 100, platform: 'TYLER_TECH',
          timestamp: new Date().toISOString()
        });
      }
      console.log(`[TYLER v8] CSV parsed: ${parsedRecords.length} records in ${pageResults.length} pages for D1 ingest`);
      return pageResults;
    }
    // Fallback if CSV parse yields nothing: return empty (don't create stubs)
    console.log(`[TYLER v8] CSV parse yielded 0 records, skipping stub creation`);
    return [];
  }

  // Fallback: page-by-page HTML scrape
  let totalRecordsScraped = 0, consecutiveEmpty = 0;
  for (let page = 1; page <= Math.min(totalPages, 100); page++) {
    if (consecutiveEmpty >= 3) break;
    const html = await tylerFetchResultsPage(session, page, env);
    const records = parseTylerResults(html);
    if (records.length === 0) { consecutiveEmpty++; continue; }
    consecutiveEmpty = 0;
    totalRecordsScraped += records.length;
    const globalPage = chunkIndex * 1000 + page;
    const result = { county: msg.county, instrumentType: msg.instrumentType, page: globalPage, records, totalFound: records.length, domTotal: totalPages * 100, timestamp: new Date().toISOString() };
    results.push(result);
    pendingUploads.push(uploadTylerToR2(env, result));
    await humanDelay(500, 1000);
  }
  await Promise.allSettled(pendingUploads);
  await updateTylerCheckpoint(env, msg, totalRecordsScraped, totalPages * 100, chunkIndex);

  // PDF download phase
  const allRecs = results.flatMap(r => r.records);
  if (allRecs.some(r => r.pdfUrl)) {
    await downloadTylerPdfs(env, session, allRecs, msg.county, msg.instrumentType);
  }

  return results;
}

// Tyler Tech: Discovery with evasion
async function discoverTyler(env, msg) {
  console.log(`[TYLER DISCOVER v8] county=${msg.county} type=${msg.instrumentType}`);
  const session = await setupTylerSession(msg.baseUrl, env);
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - TYLER_CHUNK_DAYS * 86400000);
  const searchResult = await tylerSubmitSearch(session, msg.instrumentType, fmtDate(startDate), fmtDate(endDate), env);
  if (searchResult.totalPages > 0) {
    const chunks = generateDateChunks();
    return { instrumentType: msg.instrumentType, totalRecords: chunks.length * 100 };
  }
  return { instrumentType: msg.instrumentType, totalRecords: 0 };
}

// Tyler Tech: Test connection endpoint
async function testTylerConnection(baseUrl, instrumentType, env) {
  const steps = [];
  try {
    steps.push(`Testing Tyler Tech (v8 evasion): ${baseUrl}`);
    const session = await setupTylerSession(baseUrl, env);
    steps.push(`Session OK: searchActionId=${session.searchActionId}, cookies=${session.cookies.length}, UA=${session.identity.ua.slice(0, 60)}...`);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 86400000);
    const result = await tylerSubmitSearch(session, instrumentType || '', fmtDate(startDate), fmtDate(endDate), env);
    steps.push(`Search: totalPages=${result.totalPages}`);
    if (result.totalPages > 0) {
      const html = await tylerFetchResultsPage(session, 1, env);
      const records = parseTylerResults(html);
      steps.push(`Page 1: ${records.length} records`);
      return { ok: true, steps, records: records.length, sampleRecord: records[0] || null, search: result };
    }
    return { ok: true, steps, records: 0, search: result };
  } catch (err) {
    steps.push(`ERROR: ${err.message}`);
    return { ok: false, steps, error: err.message };
  }
}

// Tyler R2 upload + checkpoint helpers
async function uploadTylerToR2(env, result) {
  const key = `ENCORE/TYLER/${result.county}/${result.instrumentType.replace(/ /g,'_')}/page_${String(result.page).padStart(6,'0')}.json`;
  await env.R2_RECORDS.put(key, JSON.stringify(result), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { county: result.county, instrumentType: result.instrumentType, platform: 'TYLER_TECH', page: String(result.page), recordCount: String(result.records.length), scrapedAt: result.timestamp },
  });
  try { await env.DB.prepare(`INSERT OR REPLACE INTO r2_uploads (r2_key, county_id, file_size, content_type, uploaded_at) VALUES (?, (SELECT id FROM counties WHERE UPPER(name) = UPPER(?)), ?, 'application/json', datetime('now'))`).bind(key, result.county, JSON.stringify(result).length).run(); } catch {}
}

async function updateTylerCheckpoint(env, msg, totalScraped, totalResults, lastPage) {
  try {
    const sql = totalResults > 0
      ? `UPDATE scrape_jobs SET last_page = ?, scraped_records = scraped_records + ?, total_records = ?, updated_at = datetime('now'), status = 'running' WHERE county_id = ? AND instrument_type_id = ?`
      : `UPDATE scrape_jobs SET last_page = ?, scraped_records = scraped_records + ?, updated_at = datetime('now'), status = 'running' WHERE county_id = ? AND instrument_type_id = ?`;
    const binds = totalResults > 0 ? [lastPage, totalScraped, totalResults, msg.countyId, msg.instrumentTypeId] : [lastPage, totalScraped, msg.countyId, msg.instrumentTypeId];
    await env.DB.prepare(sql).bind(...binds).run();
  } catch {}
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  DOCUMENT INTELLIGENCE ENGINE v8.1 — OCR + Analysis + Cloud Context        ║
// ║  Pipeline: PDF → R2 → Browser Render → Workers AI Vision → Entity Parse    ║
// ║  Every document knows: where it lives (R2), what it says (OCR), what it    ║
// ║  means (entities), and how it connects to other documents (cross-refs)     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// Document pipeline states: pending → ocr_queued → ocr_processing → ocr_complete → analyzed → (failed)
const PIPELINE_STATES = ['pending', 'ocr_queued', 'ocr_processing', 'ocr_complete', 'analyzed', 'failed'];

// Land record entity patterns — regex extractors for Texas county records
const ENTITY_PATTERNS = {
  // Legal description: Section/Block/Survey/Abstract/Township
  sectionBlockSurvey: [
    /Section\s+(\d+)[,\s]+Block\s+(\d+)[,\s]+([\w\s&]+(?:Survey|Sub(?:division)?))/gi,
    /(?:Sec(?:tion)?\.?\s*)(\d+)[,\s]*(?:Blk\.?\s*)(\d+)[,\s]*(?:(?:T&P|H&TC|GC&SF|SP|T\.?\s*&\s*P\.?)\s*(?:Ry\.?\s*(?:Co\.?\s*)?)?(?:Survey)?)/gi,
    /Abstract\s+(?:No\.?\s*)?(\d+)/gi,
    /Lot(?:s)?\s+([\d,\s&-]+)[,\s]+Block\s+(\d+)/gi,
  ],
  // Consideration / monetary value
  consideration: [
    /\$\s*([\d,]+(?:\.\d{2})?)/g,
    /(?:consideration|amount|value)[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)/gi,
  ],
  // Acreage
  acreage: [
    /([\d.]+)\s*(?:acres?|ac\.?)/gi,
    /(?:containing|being)\s+([\d.]+)\s*(?:acres?|ac\.?)/gi,
  ],
  // Mineral interest percentages
  mineralInterest: [
    /([\d.]+)\s*%\s*(?:mineral\s*interest|MI|minerals)/gi,
    /(?:an?\s+undivided\s+)([\d./]+)\s*(?:interest|%)/gi,
  ],
  // Royalty interest
  royaltyInterest: [
    /([\d.]+)\s*%\s*(?:royalty|RI|overriding\s+royalty|ORRI)/gi,
    /([\d./]+)\s*(?:of\s+)?(?:royalty|ORRI)/gi,
  ],
  // Volume/Page (Book/Page)
  volumePage: [
    /Vol(?:ume)?\.?\s*(\d+)[,\s]+(?:Pg|Page|P)\.?\s*(\d+)/gi,
    /Book\s+(\d+)[,\s]+Page\s+(\d+)/gi,
    /(\d+)\s*\/\s*(\d+)/g,  // common shorthand: 609/562
  ],
  // Property address
  address: [
    /(\d+\s+[\w\s]+(?:St(?:reet)?|Ave(?:nue)?|Rd|Road|Blvd|Dr(?:ive)?|Ln|Lane|Way|Ct|Court|Pl|Place)[.,]?\s*[\w\s]*,?\s*TX\s*\d{5})/gi,
  ],
  // Grantor/Grantee names (from OCR text, not table metadata)
  names: [
    /(?:GRANTOR|FROM|BY)[:\s]+([\w\s,.'&-]+?)(?=\n|GRANTEE|TO|$)/gi,
    /(?:GRANTEE|TO)[:\s]+([\w\s,.'&-]+?)(?=\n|GRANTOR|FROM|$)/gi,
  ],
};

// Extract structured entities from OCR text
function extractDocumentEntities(ocrText, instrumentType) {
  const entities = {
    sectionBlockSurvey: null,
    consideration: null,
    acreage: null,
    mineralInterestPct: null,
    royaltyInterestPct: null,
    volumePage: null,
    propertyAddress: null,
    grantorExtracted: null,
    granteeExtracted: null,
    legalDescriptionExtracted: null,
    allMatches: {},
  };
  if (!ocrText || ocrText.length < 10) return entities;

  const text = ocrText;

  // Section/Block/Survey
  for (const pat of ENTITY_PATTERNS.sectionBlockSurvey) {
    pat.lastIndex = 0;
    const m = pat.exec(text);
    if (m) {
      entities.sectionBlockSurvey = m[0].trim();
      entities.legalDescriptionExtracted = m[0].trim();
      break;
    }
  }

  // Consideration
  for (const pat of ENTITY_PATTERNS.consideration) {
    pat.lastIndex = 0;
    const m = pat.exec(text);
    if (m) { entities.consideration = m[1].replace(/,/g, ''); break; }
  }

  // Acreage
  for (const pat of ENTITY_PATTERNS.acreage) {
    pat.lastIndex = 0;
    const m = pat.exec(text);
    if (m) { entities.acreage = parseFloat(m[1]); break; }
  }

  // Mineral interest
  for (const pat of ENTITY_PATTERNS.mineralInterest) {
    pat.lastIndex = 0;
    const m = pat.exec(text);
    if (m) { entities.mineralInterestPct = parseFloat(m[1]); break; }
  }

  // Royalty interest
  for (const pat of ENTITY_PATTERNS.royaltyInterest) {
    pat.lastIndex = 0;
    const m = pat.exec(text);
    if (m) { entities.royaltyInterestPct = parseFloat(m[1]); break; }
  }

  // Volume/Page
  for (const pat of ENTITY_PATTERNS.volumePage) {
    pat.lastIndex = 0;
    const m = pat.exec(text);
    if (m) { entities.volumePage = `${m[1]}/${m[2]}`; break; }
  }

  // Address
  for (const pat of ENTITY_PATTERNS.address) {
    pat.lastIndex = 0;
    const m = pat.exec(text);
    if (m) { entities.propertyAddress = m[1].trim(); break; }
  }

  // Names from OCR body (supplement table metadata)
  for (const pat of ENTITY_PATTERNS.names) {
    pat.lastIndex = 0;
    const m = pat.exec(text);
    if (m) {
      const name = m[1].trim().replace(/\s+/g, ' ');
      if (name.length > 2 && name.length < 200) {
        if (!entities.grantorExtracted && /GRANTOR|FROM|BY/i.test(m[0])) entities.grantorExtracted = name;
        else if (!entities.granteeExtracted) entities.granteeExtracted = name;
      }
    }
  }

  return entities;
}

// Register a document in the pipeline after PDF upload
async function registerDocumentInPipeline(env, county, countyId, instrumentType, instrumentTypeId, docId, r2PdfKey, pdfSize) {
  try {
    await env.DB.prepare(`INSERT INTO document_pipeline (county_id, instrument_type_id, document_id, r2_pdf_key, pdf_size_bytes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now')) ON CONFLICT(county_id, document_id) DO UPDATE SET r2_pdf_key=?, pdf_size_bytes=?, updated_at=datetime('now')`).bind(countyId || 0, instrumentTypeId || 0, docId, r2PdfKey, pdfSize, r2PdfKey, pdfSize).run();
    return true;
  } catch (e) { console.error(`[PIPELINE] Register failed: ${e.message}`); return false; }
}

// Queue an OCR job for a document — searchMeta carries Tyler/PS search result fields
async function queueOcrJob(env, county, countyId, instrumentType, instrumentTypeId, docId, r2PdfKey, searchMeta) {
  try {
    await env.DB.prepare("UPDATE document_pipeline SET status='ocr_queued', queued_at=datetime('now'), updated_at=datetime('now') WHERE county_id=? AND document_id=?").bind(countyId, docId).run();
    await env.SCRAPE_QUEUE.send({
      type: 'ocr_analyze',
      county, countyId, instrumentType, instrumentTypeId,
      documentId: docId, r2PdfKey,
      // Search metadata from Tyler/PublicSearch — used as entity fallback when OCR fails
      searchMeta: searchMeta || null,
    });
    return true;
  } catch (e) { console.error(`[OCR QUEUE] Failed: ${e.message}`); return false; }
}

// Process OCR: native text first → AI vision fallback → AI entity extraction → cross-refs
async function processOcrJob(env, msg) {
  const { documentId, r2PdfKey, county, countyId, instrumentType, instrumentTypeId, searchMeta } = msg;
  console.log(`[OCR] Processing: ${county}/${documentId} key=${r2PdfKey}${searchMeta ? ' (has search metadata)' : ''}`);

  await env.DB.prepare("UPDATE document_pipeline SET status='ocr_processing', started_at=datetime('now'), updated_at=datetime('now') WHERE county_id=? AND document_id=?").bind(countyId, documentId).run();

  try {
    // Step 1: Fetch PDF from R2
    const pdfObj = await env.R2_RECORDS.get(r2PdfKey);
    if (!pdfObj) throw new Error(`PDF not found in R2: ${r2PdfKey}`);
    const pdfBuf = await pdfObj.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuf);

    // Step 2: Try native text extraction first (born-digital PDFs)
    let nativeText = '';
    let ocrMethod = 'none';
    try {
      const pdfStr = new TextDecoder('latin1').decode(pdfBytes.slice(0, Math.min(pdfBytes.length, 2 * 1024 * 1024)));
      const textChunks = [];
      // Method 1: Extract parenthesized strings from text streams
      const parenRegex = /\(([^)]{2,})\)/g;
      let pm;
      while ((pm = parenRegex.exec(pdfStr)) !== null) {
        const t = pm[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
        if (t.length > 1 && /[a-zA-Z0-9]/.test(t)) textChunks.push(t);
      }
      // Method 2: Check for text between stream/endstream markers
      const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
      let sm;
      while ((sm = streamRegex.exec(pdfStr)) !== null) {
        const block = sm[1];
        if (block.length > 10 && block.length < 50000 && /[A-Z]{2,}/.test(block)) {
          const btBlocks = block.match(/BT[\s\S]*?ET/g) || [];
          for (const bt of btBlocks) {
            const tjMatch = bt.match(/\(([^)]+)\)\s*Tj/g) || [];
            for (const tj of tjMatch) {
              const inner = tj.match(/\(([^)]+)\)/);
              if (inner && inner[1].length > 1) textChunks.push(inner[1]);
            }
          }
        }
      }
      nativeText = textChunks.join(' ').replace(/\s+/g, ' ').trim();
      // Validate text quality: count printable ASCII vs garbage characters
      const printableCount = (nativeText.match(/[\x20-\x7E]/g) || []).length;
      const printableRatio = nativeText.length > 0 ? printableCount / nativeText.length : 0;
      if (nativeText.length > 50 && printableRatio > 0.7) {
        ocrMethod = 'native';
        console.log(`[OCR NATIVE] ${county}/${documentId}: extracted ${nativeText.length} chars natively (${Math.round(printableRatio*100)}% printable)`);
      } else {
        console.log(`[OCR NATIVE] ${county}/${documentId}: native extraction unreliable — ${nativeText.length} chars, ${Math.round(printableRatio*100)}% printable`);
        nativeText = '';
      }
    } catch (e) { console.log(`[OCR NATIVE] Failed: ${e.message}`); }

    // Step 3: Determine text source
    // Priority: native PDF text → search metadata summary → empty
    // NOTE: Browser Rendering OCR removed — Cloudflare headless Chrome cannot render PDFs
    // (no built-in PDF viewer, PDF.js loading from setContent is unreliable)
    // PDFs are stored in R2 for future batch OCR when a reliable solution is available
    let ocrTexts = [];
    let pageCount = 0;
    let usedSearchMeta = false;

    if (nativeText.length >= 100) {
      ocrTexts = [nativeText];
      pageCount = 1;
    } else if (searchMeta && (searchMeta.grantor || searchMeta.grantee || searchMeta.legalDescription)) {
      // Construct a synthetic text summary from search metadata
      // This gives entity extraction something to work with
      ocrMethod = 'search_metadata';
      const parts = [];
      if (searchMeta.grantor) parts.push(`Grantor: ${searchMeta.grantor}`);
      if (searchMeta.grantee) parts.push(`Grantee: ${searchMeta.grantee}`);
      if (searchMeta.instrumentType) parts.push(`Instrument Type: ${searchMeta.instrumentType}`);
      if (searchMeta.recordedDate) parts.push(`Recorded Date: ${searchMeta.recordedDate}`);
      if (searchMeta.legalDescription) parts.push(`Legal Description: ${searchMeta.legalDescription}`);
      if (searchMeta.bookPage) parts.push(`Book/Page: ${searchMeta.bookPage}`);
      if (searchMeta.consideration) parts.push(`Consideration: ${searchMeta.consideration}`);
      ocrTexts = [parts.join('\n')];
      pageCount = 1;
      usedSearchMeta = true;
      console.log(`[OCR META] ${county}/${documentId}: using search metadata (${parts.length} fields) — PDF stored in R2 for future OCR`);
    } else {
      // No text available at all
      ocrMethod = 'none';
      console.log(`[OCR] ${county}/${documentId}: no text extractable, no search metadata — PDF stored in R2 for future OCR`);
    }

    const fullOcrText = ocrTexts.join('\n\n--- PAGE BREAK ---\n\n');

    // Step 4: Build entities — from OCR text OR directly from search metadata
    let regexEntities = {};
    let aiEntities = {};
    const entities = {
      grantorExtracted: null, granteeExtracted: null,
      legalDescriptionExtracted: null, sectionBlockSurvey: null,
      consideration: null, acreage: null,
      mineralInterestPct: null, royaltyInterestPct: null,
      volumePage: null, propertyAddress: null,
    };

    if (fullOcrText.length >= 10 && !usedSearchMeta) {
      // OCR-based extraction: regex + AI
      regexEntities = extractDocumentEntities(fullOcrText, instrumentType);
      Object.assign(entities, regexEntities);

      // AI entity extraction (second pass)
      try {
        const aiExtract = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [{
            role: 'system',
            content: 'You are a Texas land record analyst. Extract structured data from document text. Return ONLY valid JSON, no other text.'
          }, {
            role: 'user',
            content: `Extract entities from this ${instrumentType || 'land record'} from ${county} County, TX. Return JSON with these fields (null if not found): grantor, grantee, legal_description, section, block, survey, abstract_number, consideration_dollars, acreage, mineral_interest_pct, royalty_interest_pct, volume, page, property_address, filing_date, document_number.\n\nDocument text:\n${fullOcrText.slice(0, 3000)}`
          }],
          max_tokens: 1024,
        });
        const aiText = aiExtract?.response || aiExtract?.result || '';
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiEntities = JSON.parse(jsonMatch[0]);
          console.log(`[AI EXTRACT] ${county}/${documentId}: ${Object.keys(aiEntities).filter(k => aiEntities[k] !== null).length} entities via AI`);
        }
      } catch (e) { console.log(`[AI EXTRACT] Failed: ${e.message}`); }

      // Merge AI entities into base
      if (aiEntities.grantor && !entities.grantorExtracted) entities.grantorExtracted = aiEntities.grantor;
      if (aiEntities.grantee && !entities.granteeExtracted) entities.granteeExtracted = aiEntities.grantee;
      if (aiEntities.legal_description && (!entities.legalDescriptionExtracted || aiEntities.legal_description.length > (entities.legalDescriptionExtracted?.length || 0))) {
        entities.legalDescriptionExtracted = aiEntities.legal_description;
      }
      if (aiEntities.section && aiEntities.block) {
        const sbs = `Section ${aiEntities.section}, Block ${aiEntities.block}${aiEntities.survey ? ', ' + aiEntities.survey : ''}${aiEntities.abstract_number ? ', Abstract ' + aiEntities.abstract_number : ''}`;
        if (!entities.sectionBlockSurvey || sbs.length > entities.sectionBlockSurvey.length) entities.sectionBlockSurvey = sbs;
      }
      if (aiEntities.consideration_dollars && !entities.consideration) entities.consideration = String(aiEntities.consideration_dollars).replace(/[$,]/g, '');
      if (aiEntities.acreage && !entities.acreage) entities.acreage = parseFloat(aiEntities.acreage);
      if (aiEntities.mineral_interest_pct && !entities.mineralInterestPct) entities.mineralInterestPct = parseFloat(aiEntities.mineral_interest_pct);
      if (aiEntities.royalty_interest_pct && !entities.royaltyInterestPct) entities.royaltyInterestPct = parseFloat(aiEntities.royalty_interest_pct);
      if (aiEntities.volume && aiEntities.page && !entities.volumePage) entities.volumePage = `${aiEntities.volume}/${aiEntities.page}`;
      if (aiEntities.property_address && !entities.propertyAddress) entities.propertyAddress = aiEntities.property_address;
    } else if (usedSearchMeta && searchMeta) {
      // Direct entity population from search metadata — no AI needed, data is already structured
      entities.grantorExtracted = searchMeta.grantor || null;
      entities.granteeExtracted = searchMeta.grantee || null;
      entities.legalDescriptionExtracted = searchMeta.legalDescription || null;
      if (searchMeta.bookPage) {
        // Parse "Vol 1234 / Pg 567" or "1234/567" format
        const bpMatch = searchMeta.bookPage.match(/(\d+)\s*[\/]\s*(\d+)/);
        if (bpMatch) entities.volumePage = `${bpMatch[1]}/${bpMatch[2]}`;
        else entities.volumePage = searchMeta.bookPage;
      }
      if (searchMeta.consideration) {
        const cleaned = String(searchMeta.consideration).replace(/[$,\s]/g, '');
        if (cleaned && cleaned !== '0') entities.consideration = cleaned;
      }
      // Parse legal description for section/block/survey
      if (searchMeta.legalDescription) {
        const sbsMatch = searchMeta.legalDescription.match(/(?:SEC(?:TION)?\.?\s*)(\d+)[,\s]*(?:BL(?:OC)?K\.?\s*)([A-Z0-9-]+)/i);
        if (sbsMatch) {
          const survMatch = searchMeta.legalDescription.match(/(?:T&P|UNIVERSITY|WADDELL|PSL|H&TC|GC&SF|AB(?:STRACT)?\.?\s*\d+)/i);
          entities.sectionBlockSurvey = `Section ${sbsMatch[1]}, Block ${sbsMatch[2]}${survMatch ? ', ' + survMatch[0] : ''}`;
        }
      }
      console.log(`[META ENTITIES] ${county}/${documentId}: populated ${Object.values(entities).filter(v => v !== null).length} fields from search metadata`);
    }

    // Step 5: Calculate confidence
    let confidence = 0;
    if (ocrMethod === 'native') confidence = 0.5;
    else if (ocrMethod === 'search_metadata') confidence = 0.45; // search metadata is reliable structured data
    else confidence = 0.1; // no text at all
    if (entities.sectionBlockSurvey) confidence += 0.12;
    if (entities.consideration) confidence += 0.08;
    if (entities.grantorExtracted) confidence += 0.08;
    if (entities.granteeExtracted) confidence += 0.08;
    if (entities.volumePage) confidence += 0.06;
    if (entities.acreage) confidence += 0.04;
    if (entities.mineralInterestPct || entities.royaltyInterestPct) confidence += 0.08;
    if (entities.propertyAddress) confidence += 0.04;
    if (entities.legalDescriptionExtracted) confidence += 0.06;
    if (!usedSearchMeta && Object.keys(aiEntities).filter(k => aiEntities[k] !== null).length >= 4) confidence += 0.06;
    if (pageCount > 1) confidence += 0.04;
    confidence = Math.min(confidence, 1.0);
    const needsReview = confidence < 0.4;

    // Step 6: Store OCR text (or metadata summary) in R2
    const textKey = r2PdfKey.replace(/\.pdf$/i, '.txt');
    const textContent = fullOcrText.length >= 10 ? fullOcrText : `[PDF stored for future OCR — ${pdfBuf.byteLength} bytes]\nCounty: ${county}\nDocument: ${documentId}\nInstrument: ${instrumentType || 'unknown'}`;
    await env.R2_RECORDS.put(textKey, textContent, {
      httpMetadata: { contentType: 'text/plain' },
      customMetadata: {
        county, instrumentType: instrumentType || '', documentId,
        ocrModel: ocrMethod, confidence: String(confidence),
        pageCount: String(pageCount), needsReview: String(needsReview),
        usedSearchMeta: String(usedSearchMeta),
        extractedAt: new Date().toISOString(),
      },
    });

    // Step 7: Store analysis JSON in R2
    const analysisKey = r2PdfKey.replace(/\.pdf$/i, '_analysis.json');
    const analysisDoc = {
      version: '8.1.1', documentId, county, instrumentType: instrumentType || '',
      r2PdfKey, r2TextKey: textKey, r2AnalysisKey: analysisKey,
      ocrMethod, ocrModel: ocrMethod === 'native' ? 'native-pdf-text' : ocrMethod === 'search_metadata' ? 'search-index-metadata' : 'none',
      ocrConfidence: confidence, needsReview, usedSearchMeta,
      pageCount, textLength: fullOcrText.length, pdfSizeBytes: pdfBuf.byteLength,
      searchMeta: searchMeta || null,
      regexEntities, aiEntities, mergedEntities: entities,
      analyzedAt: new Date().toISOString(),
      cloudContext: {
        bucket: 'echo-prime-knowledge', pdfPath: r2PdfKey,
        textPath: textKey, analysisPath: analysisKey,
        d1Database: 'shadowglass-scraper', pipelineTable: 'document_pipeline',
      },
    };
    await env.R2_RECORDS.put(analysisKey, JSON.stringify(analysisDoc, null, 2), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { county, instrumentType: instrumentType || '', documentId, type: 'analysis', needsReview: String(needsReview) },
    });

    // Step 8: Update D1 pipeline record
    await env.DB.prepare(`UPDATE document_pipeline SET
      status='analyzed', r2_text_key=?, page_count=?,
      ocr_model=?, ocr_confidence=?,
      extracted_text=?, analysis_json=?,
      grantor_extracted=?, grantee_extracted=?,
      legal_description_extracted=?, consideration_extracted=?,
      acreage_extracted=?, mineral_interest_pct=?, royalty_interest_pct=?,
      property_address=?, section_block_survey=?, volume_page=?,
      completed_at=datetime('now'), updated_at=datetime('now')
      WHERE county_id=? AND document_id=?`).bind(
      textKey, pageCount, ocrMethod, confidence,
      textContent.slice(0, 50000), JSON.stringify(analysisDoc),
      entities.grantorExtracted, entities.granteeExtracted,
      entities.legalDescriptionExtracted, entities.consideration,
      entities.acreage, entities.mineralInterestPct, entities.royaltyInterestPct,
      entities.propertyAddress, entities.sectionBlockSurvey, entities.volumePage,
      countyId, documentId,
    ).run();

    // Step 9: Build cross-references (same grantor/grantee, same property)
    try {
      if (entities.grantorExtracted) {
        const related = await env.DB.prepare("SELECT document_id, grantee_extracted, section_block_survey FROM document_pipeline WHERE grantor_extracted=? AND document_id!=? AND county_id=? LIMIT 10").bind(entities.grantorExtracted, documentId, countyId).all();
        if (related?.results?.length > 0) {
          const crossRefKey = r2PdfKey.replace(/\.pdf$/i, '_crossrefs.json');
          await env.R2_RECORDS.put(crossRefKey, JSON.stringify({
            documentId, county, crossRefType: 'same_grantor',
            grantor: entities.grantorExtracted,
            relatedDocuments: related.results,
            generatedAt: new Date().toISOString(),
          }, null, 2), { httpMetadata: { contentType: 'application/json' } });
          console.log(`[CROSS-REF] ${county}/${documentId}: ${related.results.length} related docs (same grantor)`);
        }
      }
      if (entities.sectionBlockSurvey) {
        const related = await env.DB.prepare("SELECT document_id, grantor_extracted, grantee_extracted FROM document_pipeline WHERE section_block_survey=? AND document_id!=? LIMIT 20").bind(entities.sectionBlockSurvey, documentId).all();
        if (related?.results?.length > 0) {
          const crossRefKey = r2PdfKey.replace(/\.pdf$/i, '_property_chain.json');
          await env.R2_RECORDS.put(crossRefKey, JSON.stringify({
            documentId, county, crossRefType: 'same_property',
            property: entities.sectionBlockSurvey,
            chainOfTitle: related.results,
            generatedAt: new Date().toISOString(),
          }, null, 2), { httpMetadata: { contentType: 'application/json' } });
          console.log(`[CHAIN-OF-TITLE] ${county}/${documentId}: ${related.results.length} docs on same property`);
        }
      }
    } catch (e) { console.log(`[CROSS-REF] Error: ${e.message}`); }

    console.log(`[OCR DONE] ${county}/${documentId}: ${fullOcrText.length} chars, method=${ocrMethod}, confidence=${confidence.toFixed(2)}, entities=${Object.values(entities).filter(v => v !== null).length}${usedSearchMeta ? ' [FROM SEARCH META]' : ''}${needsReview ? ' [NEEDS REVIEW]' : ''}`);
    return { ok: true, textLength: fullOcrText.length, confidence, entities, pageCount, ocrMethod, usedSearchMeta, needsReview };

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[OCR ERROR] ${county}/${documentId}: ${errMsg}`);
    await env.DB.prepare("UPDATE document_pipeline SET status='failed', error_message=?, updated_at=datetime('now') WHERE county_id=? AND document_id=?").bind(errMsg.slice(0, 1000), countyId, documentId).run();
    return { ok: false, error: errMsg };
  }
}

// Cloud context summary for a document — tells you everything about where it lives
function buildCloudContext(pipelineRecord) {
  if (!pipelineRecord) return null;
  return {
    documentId: pipelineRecord.document_id,
    status: pipelineRecord.status,
    storage: {
      bucket: 'echo-prime-knowledge',
      pdf: pipelineRecord.r2_pdf_key || null,
      text: pipelineRecord.r2_text_key || null,
      analysis: pipelineRecord.r2_pdf_key ? pipelineRecord.r2_pdf_key.replace(/\.pdf$/i, '_analysis.json') : null,
    },
    database: {
      d1: 'shadowglass-scraper',
      pipelineTable: 'document_pipeline',
      recordsTable: 'records',
      countyId: pipelineRecord.county_id,
    },
    ocr: {
      model: pipelineRecord.ocr_model || null,
      confidence: pipelineRecord.ocr_confidence || 0,
      pageCount: pipelineRecord.page_count || 0,
      textLength: pipelineRecord.extracted_text?.length || 0,
    },
    entities: {
      grantor: pipelineRecord.grantor_extracted || null,
      grantee: pipelineRecord.grantee_extracted || null,
      legalDescription: pipelineRecord.legal_description_extracted || null,
      consideration: pipelineRecord.consideration_extracted || null,
      acreage: pipelineRecord.acreage_extracted || null,
      mineralInterestPct: pipelineRecord.mineral_interest_pct || null,
      royaltyInterestPct: pipelineRecord.royalty_interest_pct || null,
      propertyAddress: pipelineRecord.property_address || null,
      sectionBlockSurvey: pipelineRecord.section_block_survey || null,
      volumePage: pipelineRecord.volume_page || null,
    },
    timestamps: {
      created: pipelineRecord.created_at,
      queued: pipelineRecord.queued_at,
      started: pipelineRecord.started_at,
      completed: pipelineRecord.completed_at,
    },
  };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PDF DOWNLOAD ENGINE v8.1 — Download actual document PDFs to R2            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function uploadPdfToR2(env, pdfData, county, instrumentType, docId, platform, searchMeta) {
  const prefix = platform === 'TYLER_TECH' ? 'ENCORE/TYLER' : 'ENCORE';
  const typeSafe = instrumentType.replace(/ /g, '_');
  const safeDocId = docId.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const key = `${prefix}/${county}/${typeSafe}/docs/${safeDocId}.pdf`;
  await env.R2_RECORDS.put(key, pdfData, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { county, instrumentType, platform, documentId: docId, uploadedAt: new Date().toISOString(), pipelineStatus: 'pending' },
  });
  // Track in r2_uploads
  try {
    await env.DB.prepare(`INSERT OR REPLACE INTO r2_uploads (r2_key, county_id, file_size, content_type, uploaded_at) VALUES (?, (SELECT id FROM counties WHERE UPPER(name)=UPPER(?)), ?, 'application/pdf', datetime('now'))`).bind(key, county, pdfData.byteLength || 0).run();
  } catch {}
  // Auto-register in document intelligence pipeline + queue OCR
  try {
    const countyRow = await env.DB.prepare("SELECT id FROM counties WHERE UPPER(name)=UPPER(?)").bind(county).first();
    const instRow = await env.DB.prepare("SELECT id FROM instrument_types WHERE UPPER(name)=UPPER(?)").bind(instrumentType).first();
    const countyId = countyRow?.id || 0;
    const instId = instRow?.id || 0;
    await registerDocumentInPipeline(env, county, countyId, instrumentType, instId, docId, key, pdfData.byteLength || 0);
    await queueOcrJob(env, county, countyId, instrumentType, instId, docId, key, searchMeta);
    console.log(`[PIPELINE] ${county}/${docId} → registered + OCR queued (${(pdfData.byteLength / 1024).toFixed(1)} KB)`);
  } catch (e) { console.error(`[PIPELINE] Auto-register failed: ${e.message}`); }
  return key;
}

async function downloadTylerPdfs(env, session, records, county, instrumentType, maxPdfs = 15, debugLog = []) {
  const withPdf = records.filter(r => r.pdfUrl);
  const log = (msg) => { console.log(msg); debugLog.push(msg); };
  log(`[TYLER PDF] ${county}/${instrumentType}: ${withPdf.length} records with pdfUrl, limit ${maxPdfs}`);
  if (withPdf.length === 0) return 0;
  let pdfCount = 0;
  const hdrs = { ...session.identity.headers };
  delete hdrs['Accept-Encoding'];
  hdrs['Cookie'] = cookieHeader(session.cookies);

  for (const record of withPdf.slice(0, maxPdfs)) {
    try {
      // Step 1: Fetch the document viewer page (HTML) to extract the real PDF attachment URL
      const docPageUrl = record.pdfUrl.startsWith('http') ? record.pdfUrl : `${session.origin}${record.pdfUrl}`;
      const docResp = await fetch(docPageUrl, {
        headers: { ...hdrs, Accept: 'text/html, */*', Referer: `${session.origin}${session.basePath}/search/${session.searchActionId}` },
        redirect: 'follow',
      });
      session.cookies = mergeCookies(session.cookies, extractCookies(docResp));
      if (!docResp.ok) { log(`[TYLER PDF] ${record.id}: doc page HTTP ${docResp.status}`); continue; }
      const docHtml = await docResp.text();
      log(`[TYLER PDF] ${record.id}: doc page ${docHtml.length} chars, ct=${docResp.headers.get('content-type')}`);

      // Step 2: Extract the real PDF/image attachment URL from the viewer HTML
      // Tyler Tech has two URL patterns:
      //   /web/document-image-pdfjs/ → returns HTML wrapper for PDF.js viewer
      //   /web/document-image-pdf/   → returns the actual raw PDF binary
      // The raw PDF URL is in printCustom button's data-href attribute
      let pdfAttachmentUrl = null;

      // Priority 1: data-href on printCustom button — this is the direct PDF download URL
      const printBtnMatch = docHtml.match(/data-href=["'](\/web\/document-image-pdf\/[^"']+)["']/i);
      if (printBtnMatch) pdfAttachmentUrl = printBtnMatch[1];

      // Priority 2: Any /web/document-image-pdf/ URL (the NON-JS variant)
      if (!pdfAttachmentUrl) {
        const rawPdfMatch = docHtml.match(/(\/web\/document-image-pdf\/[^"'\s<>]+)/i);
        if (rawPdfMatch) pdfAttachmentUrl = rawPdfMatch[1];
      }

      // Priority 3: Convert pdfJsUrl by removing the "js" suffix
      if (!pdfAttachmentUrl) {
        const pdfJsMatch = docHtml.match(/pdfJsUrl\s*[=:]\s*["'](\/web\/document-image-pdfjs\/[^"']+)["']/i);
        if (pdfJsMatch) {
          // Convert /web/document-image-pdfjs/ → /web/document-image-pdf/ and add page number
          pdfAttachmentUrl = pdfJsMatch[1].replace('/document-image-pdfjs/', '/document-image-pdf/');
          // Add page number suffix if not present (Tyler uses -1.pdf for page 1)
          if (!pdfAttachmentUrl.match(/-\d+\.pdf/)) {
            pdfAttachmentUrl = pdfAttachmentUrl.replace(/\.pdf/, '-1.pdf');
          }
        }
      }

      // Priority 4: data-attachment-url or attachmentUrl
      if (!pdfAttachmentUrl) {
        const attMatch = docHtml.match(/attachmentUrl\s*[=:]\s*["']([^"']+)["']/i);
        if (attMatch) pdfAttachmentUrl = attMatch[1];
      }

      // Priority 5: /web/image/ pattern
      if (!pdfAttachmentUrl) {
        const imgMatch = docHtml.match(/(\/web\/image\/[^"'\s]+)/i);
        if (imgMatch) pdfAttachmentUrl = imgMatch[1];
      }

      if (!pdfAttachmentUrl) {
        log(`[TYLER PDF] ${record.id}: no PDF attachment URL found in viewer page (${docHtml.length} chars)`);
        continue;
      }

      log(`[TYLER PDF] ${record.id}: found attachment URL: ${pdfAttachmentUrl}`);

      // Step 3: Download the actual PDF from the attachment URL
      // PDF.js loads this via XHR, so use XHR-style headers
      const dlHdrs = { ...hdrs };
      dlHdrs['Cookie'] = cookieHeader(session.cookies);
      dlHdrs['Accept'] = '*/*';
      dlHdrs['Referer'] = docPageUrl;
      dlHdrs['X-Requested-With'] = 'XMLHttpRequest';
      // Use XHR sec-fetch (not navigate) since PDF.js fetches via JS
      if (session.identity.secChUa) {
        dlHdrs['Sec-Fetch-Dest'] = 'empty';
        dlHdrs['Sec-Fetch-Mode'] = 'cors';
        dlHdrs['Sec-Fetch-Site'] = 'same-origin';
      }
      const fullPdfUrl = pdfAttachmentUrl.startsWith('http') ? pdfAttachmentUrl : `${session.origin}${pdfAttachmentUrl}`;
      log(`[TYLER PDF] ${record.id}: downloading from ${fullPdfUrl}`);
      const pdfResp = await fetch(fullPdfUrl, {
        headers: dlHdrs,
        redirect: 'follow',
      });
      session.cookies = mergeCookies(session.cookies, extractCookies(pdfResp));
      if (!pdfResp.ok) { log(`[TYLER PDF] ${record.id}: PDF download HTTP ${pdfResp.status}`); continue; }

      const ct = pdfResp.headers.get('content-type') || '';
      const data = await pdfResp.arrayBuffer();
      log(`[TYLER PDF] ${record.id}: downloaded ${data.byteLength} bytes, ct=${ct}`);

      // Verify this is actually a PDF/image, not HTML
      const firstBytes = new Uint8Array(data.slice(0, 10));
      const header = String.fromCharCode(...firstBytes);
      const isPdf = header.startsWith('%PDF');
      const isTiff = firstBytes[0] === 0x49 && firstBytes[1] === 0x49; // little-endian TIFF
      const isImage = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8; // JPEG
      const isPng = firstBytes[0] === 0x89 && firstBytes[1] === 0x50; // PNG

      if (!isPdf && !isTiff && !isImage && !isPng && data.byteLength < 5000) {
        // Decode the small response to see what error page we got
        const errorText = new TextDecoder().decode(data).slice(0, 200);
        log(`[TYLER PDF] ${record.id}: not a valid document (${data.byteLength}b, header: ${header.slice(0, 8)}, body: ${errorText}), skipping`);
        continue;
      }

      if (data.byteLength < 200) { log(`[TYLER PDF] ${record.id}: too small (${data.byteLength}), skipping`); continue; }

      // Pass search metadata so the pipeline can use it as entity fallback when OCR fails
      const searchMeta = {
        grantor: record.grantor || null,
        grantee: record.grantee || null,
        instrumentType: record.instrumentType || instrumentType,
        recordedDate: record.recordedDate || record.filingDate || null,
        legalDescription: record.legalDescription || null,
        bookPage: record.bookPage || null,
        consideration: record.consideration || null,
        source: 'tyler_search',
      };
      await uploadPdfToR2(env, data, county, instrumentType, record.id, 'TYLER_TECH', searchMeta);
      log(`[TYLER PDF] ${record.id}: uploaded to R2 successfully`);
      pdfCount++;
      await humanDelay(200, 500);
    } catch (err) {
      log(`[TYLER PDF] ${record.id}: error: ${err.message}`);
    }
  }
  console.log(`[TYLER PDF] ${pdfCount} PDFs downloaded for ${county}/${instrumentType}`);
  return pdfCount;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  BROWSER RENDERING ENGINE v8.1 — Zero-PC PublicSearch via @cloudflare/puppeteer
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function applyBrowserEvasion(page) {
  const identity = generateIdentity();
  await page.setUserAgent(identity.ua);

  // ═══ GHOST MODE v9.1 — Full anti-fingerprint suite ═══

  // Randomize viewport — never use exact default dimensions
  const widths = [1366, 1440, 1536, 1600, 1680, 1920, 2560];
  const heights = [768, 900, 864, 1024, 1050, 1080, 1440];
  const vw = widths[Math.floor(Math.random() * widths.length)] + Math.floor(Math.random() * 20) - 10;
  const vh = heights[Math.floor(Math.random() * heights.length)] + Math.floor(Math.random() * 20) - 10;
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: Math.random() > 0.7 ? 2 : 1 });

  // Determine platform from UA for consistent fingerprint
  const isMac = identity.ua.includes('Macintosh');
  const isLinux = identity.ua.includes('Linux');
  const platformStr = isMac ? 'MacIntel' : (isLinux ? 'Linux x86_64' : 'Win32');
  const oscpu = isMac ? 'Intel Mac OS X 10.15' : (isLinux ? 'Linux x86_64' : undefined);
  const hardwareConcurrency = [4, 6, 8, 12, 16][Math.floor(Math.random() * 5)];
  const deviceMemory = [4, 8, 16][Math.floor(Math.random() * 3)];

  // Timezone offsets matching US counties (Central/Mountain)
  const tzOffsets = [-360, -300]; // CST=-360, CDT=-300 (minutes)
  const tzOffset = tzOffsets[Math.floor(Math.random() * tzOffsets.length)];
  const tzNames = ['America/Chicago', 'America/Denver'];
  const tzName = tzNames[Math.floor(Math.random() * tzNames.length)];

  // WebGL renderer/vendor variations
  const webglRenderers = [
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  ];
  const webgl = webglRenderers[Math.floor(Math.random() * webglRenderers.length)];

  await page.evaluateOnNewDocument((params) => {
    // ── Core navigator spoofs ──
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'platform', { get: () => params.platformStr });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => params.hardwareConcurrency });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => params.deviceMemory });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
    if (params.oscpu) Object.defineProperty(navigator, 'oscpu', { get: () => params.oscpu });

    // ── Plugin spoofing (Chrome-realistic) ──
    Object.defineProperty(navigator, 'plugins', { get: () => {
      const p = { length: 5, 0: { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' }, 1: { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' }, 2: { name: 'Native Client', filename: 'internal-nacl-plugin' }, 3: { name: 'Chromium PDF Plugin', filename: 'internal-pdf-viewer' }, 4: { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer' } };
      p.item = i => p[i]; p.namedItem = n => Object.values(p).find(v => v?.name === n); p.refresh = () => {};
      return p;
    }});

    // ── Permission spoofing ──
    const origQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = p => p.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : origQuery.call(window.navigator.permissions, p);

    // ── Chrome runtime shim (headless detection defense) ──
    window.chrome = { runtime: { onConnect: { addListener: () => {} }, onMessage: { addListener: () => {} } }, loadTimes: () => ({ commitLoadTime: Date.now() / 1000, finishDocumentLoadTime: Date.now() / 1000 + 0.5, firstPaintTime: Date.now() / 1000 + 0.1, navigationType: 'Other' }), csi: () => ({ onloadT: Date.now(), pageT: 1000 + Math.random() * 2000, startE: Date.now() - 1000, tran: 15 }) };

    // ── Timezone spoofing ──
    const origDate = Date;
    const offsetMs = params.tzOffset * 60 * 1000;
    const origGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() { return params.tzOffset; };
    try { Intl.DateTimeFormat.prototype.resolvedOptions = new Proxy(Intl.DateTimeFormat.prototype.resolvedOptions, { apply(target, thisArg, args) { const result = Reflect.apply(target, thisArg, args); result.timeZone = params.tzName; return result; } }); } catch {}

    // ── WebGL fingerprint spoofing ──
    const getParameterProxy = function(target) {
      return new Proxy(target, {
        apply(fn, thisArg, args) {
          const param = args[0];
          // UNMASKED_VENDOR_WEBGL = 0x9245, UNMASKED_RENDERER_WEBGL = 0x9246
          if (param === 0x9245 || param === 37445) return params.webgl.vendor;
          if (param === 0x9246 || param === 37446) return params.webgl.renderer;
          return Reflect.apply(fn, thisArg, args);
        }
      });
    };
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const ctx = origGetContext.apply(this, [type, ...args]);
      if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
        if (ctx.getParameter && !ctx.__proxied) {
          ctx.getParameter = getParameterProxy(ctx.getParameter.bind(ctx));
          ctx.__proxied = true;
        }
        // Also proxy getExtension for WEBGL_debug_renderer_info
        const origGetExt = ctx.getExtension.bind(ctx);
        ctx.getExtension = function(name) {
          const ext = origGetExt(name);
          if (name === 'WEBGL_debug_renderer_info' && ext) {
            return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
          }
          return ext;
        };
      }
      return ctx;
    };

    // ── Canvas fingerprint noise injection ──
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, Math.min(this.width, 16), Math.min(this.height, 16));
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] ^ (Math.random() > 0.99 ? 1 : 0);     // tiny R noise
          imageData.data[i+1] = imageData.data[i+1] ^ (Math.random() > 0.99 ? 1 : 0); // tiny G noise
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return origToDataURL.apply(this, [type, quality]);
    };

    // ── AudioContext fingerprint defense ──
    if (window.AudioContext || window.webkitAudioContext) {
      const ACtx = window.AudioContext || window.webkitAudioContext;
      const origCreateOscillator = ACtx.prototype.createOscillator;
      ACtx.prototype.createOscillator = function() {
        const osc = origCreateOscillator.apply(this, arguments);
        const origConnect = osc.connect.bind(osc);
        osc.connect = function(dest) {
          if (dest instanceof AnalyserNode) {
            const gain = this.context.createGain();
            gain.gain.value = 1 + (Math.random() * 0.0001 - 0.00005); // imperceptible noise
            origConnect(gain);
            gain.connect(dest);
            return dest;
          }
          return origConnect(dest);
        };
        return osc;
      };
    }

    // ── Headless Chrome detection blockers ──
    // CDP detection
    Object.defineProperty(window, 'cdc_adoQpoasnfa76pfcZLmcfl_Array', { get: () => undefined });
    Object.defineProperty(window, 'cdc_adoQpoasnfa76pfcZLmcfl_Promise', { get: () => undefined });
    Object.defineProperty(window, 'cdc_adoQpoasnfa76pfcZLmcfl_Symbol', { get: () => undefined });
    // Automation indicator
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] }); // non-empty
    // Connection type (helps with consistency)
    if (navigator.connection) {
      Object.defineProperty(navigator.connection, 'rtt', { get: () => params.rtt || 50 });
    }

  }, { platformStr, hardwareConcurrency, deviceMemory, oscpu, tzOffset, tzName, webgl, rtt: parseInt(identity.conn?.rtt || '50') });

  return identity;
}

// ═══ Human behavior simulation — mouse movements + scrolling ═══
async function simulateHumanBehavior(page) {
  // Random mouse movements (3-5 movements across the page)
  const moves = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < moves; i++) {
    const x = 100 + Math.floor(Math.random() * 800);
    const y = 100 + Math.floor(Math.random() * 500);
    await page.mouse.move(x, y, { steps: 5 + Math.floor(Math.random() * 10) });
    await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
  }
  // Random scroll (like a human glancing at the page)
  await page.evaluate(() => {
    const scrollAmount = 100 + Math.floor(Math.random() * 300);
    window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
  });
  await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
}

async function scrapePublicSearchBrowser(env, msg) {
  const results = [];
  const pendingUploads = [];
  const browser = await launchBrowserWithRetry(env);
  const page = await browser.newPage();
  try {
    const identity = await applyBrowserEvasion(page);
    await page.setRequestInterception(true);
    page.on('request', req => {
      const t = req.resourceType();
      ['image', 'stylesheet', 'font', 'media'].includes(t) ? req.abort() : req.continue();
    });

    const dateRange = msg.dateRange || null;
    const searchUrl = buildSearchUrl(msg.baseUrl, msg.instrumentType, msg.startPage, dateRange);
    console.log(`[PS-BR] ${msg.county}/${msg.instrumentType} page=${msg.startPage}${dateRange ? ' dateRange=' + dateRange : ''}: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForSelector('tbody tr', { timeout: 20000 }); } catch {
      // Log the page content for debugging if no table rows found
      try { const bodySnippet = await page.evaluate(() => (document.body?.innerText || '').slice(0, 200)); console.log(`[PS-BR] No tbody tr found. Page snippet: ${bodySnippet}`); } catch {}
      await browser.close(); return results;
    }
    // Ghost mode: simulate human behavior before extracting data
    await simulateHumanBehavior(page);

    const firstPage = await page.evaluate(() => {
      let domTotal = 0;
      const bodyText = document.body?.innerText || '';
      const m = bodyText.match(/(\d+)\s*-\s*(\d+)\s+of\s+([\d,]+)\s+results/i);
      if (m) domTotal = parseInt(m[3].replace(/,/g, ''), 10);
      const records = [];
      const rows = document.querySelectorAll('tbody tr');
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length < 7) continue;
        const grantor = (cells[3]?.textContent || '').trim();
        const grantee = (cells[4]?.textContent || '').trim();
        const docType = (cells[5]?.textContent || '').trim();
        const recordedDate = (cells[6]?.textContent || '').trim();
        const docNumber = (cells[7]?.textContent || '').trim();
        const bookPage = (cells[8]?.textContent || '').trim();
        const legalDesc = (cells[9]?.textContent || '').trim();
        if (!grantor && !grantee && !docType) continue;
        const docId = rows[i].getAttribute('data-id') || rows[i].getAttribute('data-doc-id') || docNumber || `doc_${i}_${Date.now()}`;
        let pdfUrl = '';
        const link = rows[i].querySelector('a[href*="document"], a[href*="details"], a[href*="view"]');
        if (link) pdfUrl = link.href || link.getAttribute('href') || '';
        else { const du = rows[i].getAttribute('data-url') || rows[i].getAttribute('data-href') || ''; if (du) pdfUrl = du; }
        records.push({ id: docId, instrumentType: docType, filingDate: recordedDate, recordedDate, grantor, grantee, legalDescription: legalDesc, bookPage, consideration: '', pdfUrl: pdfUrl || undefined });
      }
      return { records, domTotal };
    });

    const domTotal = firstPage.domTotal;
    console.log(`[PS-BR] Page ${msg.startPage}: ${firstPage.records.length} records, domTotal=${domTotal}`);

    if (firstPage.records.length > 0) {
      const result = { county: msg.county, instrumentType: msg.instrumentType, page: msg.startPage, records: firstPage.records, totalFound: firstPage.records.length, domTotal, dateRange: msg.dateRange || null, timestamp: now(), platform: 'PUBLICSEARCH' };
      results.push(result);
      pendingUploads.push(uploadToR2(env, result));
    }

    const totalPages = domTotal > 0 ? Math.ceil(domTotal / RECORDS_PER_PAGE) : msg.endPage + 1;
    let consecutiveEmpty = 0, batchRecordCount = firstPage.records.length;

    for (let pg = msg.startPage + 1; pg <= Math.min(msg.endPage, totalPages - 1); pg++) {
      if (domTotal > 0 && pg * RECORDS_PER_PAGE >= domTotal) break;
      if (consecutiveEmpty >= 3) break;
      await humanDelay(800, 2000);
      try {
        const nextUrl = buildSearchUrl(msg.baseUrl, msg.instrumentType, pg, dateRange);
        await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        try { await page.waitForSelector('tbody tr', { timeout: 20000 }); } catch { consecutiveEmpty++; continue; }
        const pageData = await page.evaluate(() => {
          const records = [];
          const rows = document.querySelectorAll('tbody tr');
          for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length < 7) continue;
            const grantor = (cells[3]?.textContent || '').trim(), grantee = (cells[4]?.textContent || '').trim(), docType = (cells[5]?.textContent || '').trim();
            const recordedDate = (cells[6]?.textContent || '').trim(), docNumber = (cells[7]?.textContent || '').trim();
            if (!grantor && !grantee && !docType) continue;
            const docId = rows[i].getAttribute('data-id') || docNumber || `doc_${i}_${Date.now()}`;
            let pdfUrl = '';
            const link = rows[i].querySelector('a[href*="document"], a[href*="details"], a[href*="view"]');
            if (link) pdfUrl = link.href || link.getAttribute('href') || '';
            records.push({ id: docId, instrumentType: docType, filingDate: recordedDate, recordedDate, grantor, grantee, legalDescription: (cells[9]?.textContent || '').trim(), bookPage: (cells[8]?.textContent || '').trim(), consideration: '', pdfUrl: pdfUrl || undefined });
          }
          return { records };
        });
        if (pageData.records.length === 0) { consecutiveEmpty++; continue; }
        consecutiveEmpty = 0;
        batchRecordCount += pageData.records.length;
        const pr = { county: msg.county, instrumentType: msg.instrumentType, page: pg, records: pageData.records, totalFound: pageData.records.length, domTotal, dateRange: msg.dateRange || null, timestamp: now(), platform: 'PUBLICSEARCH' };
        results.push(pr);
        pendingUploads.push(uploadToR2(env, pr));
      } catch (pgErr) {
        // v9.1: Gracefully handle mid-scrape browser death — return what we have so far
        const pgErrMsg = pgErr instanceof Error ? pgErr.message : String(pgErr);
        if (pgErrMsg.includes('WebSocket') || pgErrMsg.includes('Target closed') || pgErrMsg.includes('Protocol error') || pgErrMsg.includes('Session closed')) {
          console.log(`[PS-BR] Browser died mid-scrape at page ${pg}: ${pgErrMsg}. Returning ${results.length} partial results.`);
          break; // exit page loop, return whatever we got
        }
        throw pgErr; // non-browser error, propagate
      }
    }

    await Promise.allSettled(pendingUploads);
    await batchUpdateCheckpoint(env, msg, batchRecordCount, domTotal, results.length > 0 ? results[results.length - 1].page : msg.startPage);

    // PDF download phase — max 10 per batch
    const allRecords = results.flatMap(r => r.records);
    const withPdf = allRecords.filter(r => r.pdfUrl);
    if (withPdf.length > 0) {
      let pdfCount = 0;
      for (const rec of withPdf.slice(0, 10)) {
        try {
          const pdfUrl = rec.pdfUrl.startsWith('http') ? rec.pdfUrl : `${msg.baseUrl}${rec.pdfUrl}`;
          const pdfResp = await page.goto(pdfUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          if (pdfResp) {
            const buf = await pdfResp.buffer();
            if (buf.byteLength > 500) {
              await uploadPdfToR2(env, buf.buffer, msg.county, msg.instrumentType, rec.id, 'PUBLICSEARCH');
              pdfCount++;
            }
          }
          await humanDelay(300, 700);
        } catch {}
      }
      if (pdfCount > 0) console.log(`[PS PDF] ${pdfCount} PDFs for ${msg.county}/${msg.instrumentType}`);
    }
  } finally { await browser.close(); }
  return results;
}

async function discoverPublicSearchBrowser(env, msg) {
  const browser = await launchBrowserWithRetry(env);
  const page = await browser.newPage();
  try {
    await applyBrowserEvasion(page);
    await page.setRequestInterception(true);
    page.on('request', req => { ['image','stylesheet','font','media'].includes(req.resourceType()) ? req.abort() : req.continue(); });
    await page.goto(buildSearchUrl(msg.baseUrl, msg.instrumentType, 0), { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await page.waitForSelector('tbody tr', { timeout: 25000 }); } catch { return { instrumentType: msg.instrumentType, totalRecords: 0 }; }
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const total = parseDomTotalFromHtml(bodyText);
    console.log(`[PS-BR DISCOVER] ${msg.county}/${msg.instrumentType}: ${total} records`);
    return { instrumentType: msg.instrumentType, totalRecords: total };
  } finally { await browser.close(); }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TEXASFILE SCRAPER — Browser Rendering (Django form automation)            ║
// ║  Martin, Crane, Glasscock, Loving, Pecos, Upton, Ward, Winkler            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const TEXASFILE_OPR_MAX_ESTIMATE = 200;

// TexasFile login handler — registers or logs in, returns authenticated page
async function texasFileLogin(page, env) {
  // Priority: env secrets (Wrangler secrets) > KV stored creds
  const stored = await env.DEDUP_KV.get('texasfile_creds', 'json').catch(() => null);
  const email = env.TEXASFILE_EMAIL || stored?.email || '';
  const password = env.TEXASFILE_PASSWORD || stored?.password || '';

  if (email && password) {
    // Try login first
    console.log(`[TF-AUTH] Attempting login with ${email.substring(0, 5)}...`);
    await page.goto('https://www.texasfile.com/login/', { waitUntil: 'networkidle0', timeout: 30000 });
    await humanDelay(800, 1500);

    // Fill login form
    const loginOk = await page.evaluate((em, pw) => {
      const emailInput = document.querySelector('input[name="username"], input[name="email"], input[type="email"]');
      const pwInput = document.querySelector('input[name="password"], input[type="password"]');
      if (!emailInput || !pwInput) return false;
      emailInput.value = em; emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      pwInput.value = pw; pwInput.dispatchEvent(new Event('input', { bubbles: true }));
      const btn = document.querySelector('button[type="submit"], input[type="submit"], .login-button, #loginBtn');
      if (btn) { btn.click(); return true; }
      const form = emailInput.closest('form');
      if (form) { form.submit(); return true; }
      return false;
    }, email, password);

    if (loginOk) {
      await humanDelay(2000, 4000);
      try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }); } catch {}
      const loggedIn = await page.evaluate(() => {
        return !!(window.Server?.props?.user?.is_authenticated) || window.location.href.includes('/search/');
      });
      if (loggedIn) {
        console.log(`[TF-AUTH] Login successful`);
        return true;
      }
      console.log(`[TF-AUTH] Login failed, URL: ${page.url()}`);
    }
  }

  // No credentials or login failed — attempt registration
  console.log(`[TF-AUTH] Registering new account...`);
  const regUrl = page.url().includes('/register') ? page.url() : 'https://www.texasfile.com/register/';
  if (!page.url().includes('/register')) {
    await page.goto(regUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await humanDelay(1000, 2000);
  }

  // Generate credentials
  const ts = Date.now().toString(36);
  const newEmail = `echoland.${ts}@outlook.com`;
  const newPassword = `EcH0Pr1m3!${ts}`;
  const firstName = 'Echo';
  const lastName = 'Prime';

  const regOk = await page.evaluate((fn, ln, em, pw) => {
    // Find form fields
    const fields = {};
    document.querySelectorAll('input').forEach(inp => {
      const n = (inp.name || '').toLowerCase();
      const p = (inp.placeholder || '').toLowerCase();
      const l = (inp.closest('label')?.textContent || '').toLowerCase();
      if (n.includes('first') || p.includes('first') || l.includes('first name')) fields.first = inp;
      else if (n.includes('last') || p.includes('last') || l.includes('last name')) fields.last = inp;
      else if ((n.includes('email') || n.includes('username')) && !n.includes('confirm')) fields.email = inp;
      else if (n.includes('confirm') || (n.includes('email') && Object.keys(fields).includes('email'))) fields.confirmEmail = inp;
      else if (n.includes('password') || inp.type === 'password') {
        if (!fields.password) fields.password = inp;
      }
    });
    if (!fields.email || !fields.password) return false;
    if (fields.first) { fields.first.value = fn; fields.first.dispatchEvent(new Event('input', { bubbles: true })); }
    if (fields.last) { fields.last.value = ln; fields.last.dispatchEvent(new Event('input', { bubbles: true })); }
    fields.email.value = em; fields.email.dispatchEvent(new Event('input', { bubbles: true }));
    if (fields.confirmEmail) { fields.confirmEmail.value = em; fields.confirmEmail.dispatchEvent(new Event('input', { bubbles: true })); }
    fields.password.value = pw; fields.password.dispatchEvent(new Event('input', { bubbles: true }));

    // Select experience type
    const expSelect = document.querySelector('select[name*="experience"], select[name*="industry"], select[name*="customize"]');
    if (expSelect) {
      const opts = Array.from(expSelect.options);
      const landOpt = opts.find(o => o.text.toLowerCase().includes('land'));
      if (landOpt) expSelect.value = landOpt.value;
      else if (opts.length > 1) expSelect.value = opts[1].value;
      expSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Select referral source
    const refSelect = document.querySelectorAll('select');
    for (const sel of refSelect) {
      if (sel === expSelect) continue;
      const opts = Array.from(sel.options);
      const searchOpt = opts.find(o => o.text.toLowerCase().includes('google') || o.text.toLowerCase().includes('search'));
      if (searchOpt) { sel.value = searchOpt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }

    // Accept TOS
    const tosCheck = document.querySelector('input[name*="agree"], input[name*="tos"], input[name*="terms"]');
    if (tosCheck && !tosCheck.checked) { tosCheck.checked = true; tosCheck.dispatchEvent(new Event('change', { bubbles: true })); }

    // Submit
    const btn = document.querySelector('button[type="submit"]:not([name]), input[type="submit"], .register-button');
    const form = fields.email.closest('form');
    if (btn) { btn.click(); return true; }
    if (form) { form.submit(); return true; }
    return false;
  }, firstName, lastName, newEmail, newPassword);

  if (regOk) {
    await humanDelay(3000, 5000);
    try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }); } catch {}

    // Store new credentials
    await env.DEDUP_KV.put('texasfile_creds', JSON.stringify({ email: newEmail, password: newPassword, created: now() }));
    console.log(`[TF-AUTH] Registered as ${newEmail}, stored creds in KV`);

    const postReg = page.url();
    if (postReg.includes('/search/') || !postReg.includes('/register')) {
      console.log(`[TF-AUTH] Registration successful, redirected to ${postReg}`);
      return true;
    }
  }

  console.log(`[TF-AUTH] Registration may need email verification. URL: ${page.url()}`);
  return false;
}

async function scrapeTexasFileBrowser(env, msg) {
  const results = [];
  const pendingUploads = [];
  const browser = await launchBrowserWithRetry(env);
  const page = await browser.newPage();
  try {
    const identity = await applyBrowserEvasion(page);
    await page.setRequestInterception(true);
    page.on('request', req => {
      const t = req.resourceType();
      ['image', 'font', 'media'].includes(t) ? req.abort() : req.continue();
    });

    // PRE-AUTH: Login via HTTP fetch first, then inject session cookie into browser
    const httpSession = await texasFileFetchLogin(env);
    if (httpSession) {
      console.log(`[TF-BR] ${msg.county}: Injecting HTTP session cookie into browser`);
      await page.setCookie(
        { name: 'csrftoken', value: httpSession.csrfCookie, domain: '.texasfile.com', path: '/', secure: true, sameSite: 'Lax' },
        { name: 'sessionid', value: httpSession.sessionId, domain: '.texasfile.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }
      );
    }

    const searchUrl = msg.baseUrl;
    console.log(`[TF-BR] ${msg.county}: navigating to ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await humanDelay(1500, 3000);

    // Dismiss any modals
    try { const cb = await page.$('button.close, .modal-close, [aria-label="Close"]'); if (cb) await cb.click(); } catch {}

    // Read Server.props for county structure
    const serverProps = await page.evaluate(() => {
      if (window.Server && window.Server.props) {
        return {
          countyName: window.Server.props.county?.name || '',
          indexStart: window.Server.props.search?.index_start_date || '',
          indexEnd: window.Server.props.search?.current_end_date || '',
          anonSearch: window.Server.props.search?.allow_anon_search || false,
          books: (window.Server.props.bookCoverageDetails || []).map(b => ({
            book: b.book_type || b.small_book_type || '',
            volStart: b.volume_start, volEnd: b.volume_end,
            startDate: b.start_date, endDate: b.end_date, current: b.current,
          })),
        };
      }
      return null;
    });
    // Check authentication status
    const isAuth = await page.evaluate(() => window.Server?.props?.user?.is_authenticated || false);
    console.log(`[TF-BR] ${msg.county}: anonSearch=${serverProps?.anonSearch}, books=${serverProps?.books?.length}, isAuth=${isAuth}`);

    // If not authenticated and anon search not allowed, try browser login
    if (!isAuth && !serverProps?.anonSearch) {
      console.log(`[TF-BR] ${msg.county}: NOT AUTHENTICATED — attempting browser login`);
      const authOk = await texasFileLogin(page, env);
      if (authOk) {
        // Re-navigate to search page after login
        await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 60000 });
        await humanDelay(1000, 2000);
        const nowAuth = await page.evaluate(() => window.Server?.props?.user?.is_authenticated || false);
        console.log(`[TF-BR] ${msg.county}: after browser login, isAuth=${nowAuth}`);
        if (!nowAuth) {
          console.log(`[TF-BR] ${msg.county}: AUTH FAILED — cannot scrape, need valid credentials`);
          return [];
        }
      } else {
        console.log(`[TF-BR] ${msg.county}: browser login failed — cannot scrape`);
        return [];
      }
    }

    const book = msg.book || 'OR'; // Use form value (OR not OPR)
    const volumeStart = msg.volumeStart || 1;
    const volumeEnd = msg.volumeEnd || volumeStart;
    let totalExtracted = 0;

    for (let vol = volumeStart; vol <= volumeEnd; vol++) {
      if (vol > volumeStart) {
        await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 60000 });
        await humanDelay(800, 1500);
      }

      // Select book type
      await page.evaluate((bookType) => {
        const sel = document.querySelector('#BookInput, select[name="bvp-0-book"]');
        if (sel) { sel.value = bookType; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      }, book);
      await humanDelay(200, 500);

      // Fill volume
      await page.evaluate((volNum) => {
        const inp = document.querySelector('#VolumeInput, input[name="bvp-0-volume"]');
        if (inp) { inp.value = ''; inp.value = String(volNum); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
      }, vol);
      await humanDelay(200, 400);

      // Clear page field (get all pages)
      await page.evaluate(() => {
        const inp = document.querySelector('#PageInput, input[name="bvp-0-page"]');
        if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); }
      });
      await humanDelay(300, 600);

      // Click BVP Search
      console.log(`[TF-BR] ${msg.county}: search Book=${book} Vol=${vol}`);
      const clicked = await page.evaluate(() => {
        const btn = document.querySelector('#BVPSearch, button[name="OPR_VP"]');
        if (btn) { btn.click(); return true; }
        const form = document.querySelector('form[action*="/search/"]');
        if (form) { const h = document.createElement('input'); h.type='hidden'; h.name='OPR_VP'; h.value='Search'; form.appendChild(h); form.submit(); return true; }
        return false;
      });
      if (!clicked) { console.log(`[TF-BR] ${msg.county}: no search button for Vol ${vol}`); continue; }

      await humanDelay(2000, 4000);
      try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }); } catch {}

      // Check login/register redirect
      const curUrl = page.url();
      if (curUrl.includes('/login') || curUrl.includes('/register') || curUrl.includes('/accounts/')) {
        console.log(`[TF-BR] ${msg.county}: AUTH REDIRECT at ${curUrl} — attempting login`);
        const authOk = await texasFileLogin(page, env);
        if (!authOk) {
          console.log(`[TF-BR] ${msg.county}: AUTH FAILED — cannot scrape without login`);
          break;
        }
        // Navigate back to search and retry this volume
        await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 60000 });
        await humanDelay(800, 1500);
        // Re-fill and re-submit
        await page.evaluate((bookType) => {
          const sel = document.querySelector('#BookInput, select[name="bvp-0-book"]');
          if (sel) { sel.value = bookType; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        }, book);
        await humanDelay(200, 400);
        await page.evaluate((volNum) => {
          const inp = document.querySelector('#VolumeInput, input[name="bvp-0-volume"]');
          if (inp) { inp.value = String(volNum); inp.dispatchEvent(new Event('input', { bubbles: true })); }
        }, vol);
        await humanDelay(200, 400);
        await page.evaluate(() => {
          const btn = document.querySelector('#BVPSearch, button[name="OPR_VP"]');
          if (btn) btn.click();
        });
        await humanDelay(2000, 4000);
        try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }); } catch {}
        // Check again
        const retryUrl = page.url();
        if (retryUrl.includes('/login') || retryUrl.includes('/register')) {
          console.log(`[TF-BR] ${msg.county}: STILL redirected after auth at ${retryUrl}`);
          break;
        }
      }

      // Extract results
      const pageResults = await page.evaluate((county, bk, v) => {
        const records = [];
        let headerMap = {};

        // Method 1: Bokeh DataTable — smart key detection
        if (window.Bokeh && window.Bokeh.documents && window.Bokeh.documents[0]) {
          const doc = window.Bokeh.documents[0];
          const models = doc._all_models || {};
          let bestData = null, bestLen = 0;
          for (const [, model] of Object.entries(models)) {
            const d = model.data || (model.attributes && model.attributes.data);
            if (d && typeof d === 'object') {
              const ks = Object.keys(d).filter(k => k !== 'index');
              const len = d[ks[0]]?.length || 0;
              if (len > bestLen && ks.length >= 3) { bestData = d; bestLen = len; }
            }
          }
          if (bestData && bestLen > 0) {
            const d = bestData;
            const ks = Object.keys(d);
            const fk = (pats) => ks.find(k => pats.some(p => k.toLowerCase().includes(p)));
            const gK = fk(['grantor','direct_name','seller','from_name']) || '';
            const geK = fk(['grantee','indirect_name','buyer','to_name']) || '';
            const tK = fk(['doc_type','type','kind','inst_type','document_type']) || '';
            const dK = fk(['date','filed','recorded','file_date']) || '';
            const nK = fk(['number','doc_number','inst_num','instrument_number']) || '';
            const lK = fk(['legal','property','description']) || '';
            const pgK = fk(['page','pg']) || '';
            const vK = fk(['vol','volume']) || '';
            const bkK = fk(['book','bk']) || '';
            const cK = fk(['consider','amount','value']) || '';
            for (let i = 0; i < bestLen; i++) {
              records.push({
                grantor: gK ? (d[gK] || [])[i] || '' : '',
                grantee: geK ? (d[geK] || [])[i] || '' : '',
                instrumentType: tK ? (d[tK] || [])[i] || '' : '',
                recordedDate: dK ? (d[dK] || [])[i] || '' : '',
                instrumentNumber: nK ? (d[nK] || [])[i] || '' : '',
                bookPage: `${bkK ? (d[bkK]||[])[i]||bk : bk}/${vK ? (d[vK]||[])[i]||v : v}/${pgK ? (d[pgK]||[])[i]||'' : ''}`,
                legalDescription: lK ? (d[lK] || [])[i] || '' : '',
                consideration: cK ? (d[cK] || [])[i] || '' : '',
              });
            }
          }
        }

        // Method 2: HTML table with dynamic header detection
        if (records.length === 0) {
          // Find headers first to map columns correctly
          const allTables = document.querySelectorAll('table');
          let dataTable = null;
          for (const tbl of allTables) {
            const ths = tbl.querySelectorAll('th');
            if (ths.length >= 4) {
              dataTable = tbl;
              Array.from(ths).forEach((th, idx) => {
                const t = (th.textContent || '').trim().toLowerCase();
                if (t.includes('grantor') || t.includes('direct') && t.includes('name')) headerMap.grantor = idx;
                else if (t.includes('grantee') || t.includes('indirect') && t.includes('name')) headerMap.grantee = idx;
                else if (t.includes('type') || t.includes('doc type') || t.includes('instrument type') || t.includes('kind')) headerMap.type = idx;
                else if (t.includes('date') || t.includes('filed') || t.includes('recorded')) headerMap.date = idx;
                else if (t.includes('number') || t.includes('inst') || t.includes('doc #') || t.includes('doc no')) headerMap.number = idx;
                else if (t.includes('book') && !t.includes('vol')) headerMap.book = idx;
                else if (t.includes('vol')) headerMap.volume = idx;
                else if (t.includes('page') && !t.includes('pages')) headerMap.page = idx;
                else if (t.includes('legal') || t.includes('description') || t.includes('property')) headerMap.legal = idx;
                else if (t.includes('consider') || t.includes('amount')) headerMap.consideration = idx;
                else if (t.includes('bvp') || (t.includes('book') && t.includes('vol'))) headerMap.bvp = idx;
              });
              break;
            }
          }

          const rows = dataTable
            ? dataTable.querySelectorAll('tbody tr, tr')
            : document.querySelectorAll('table.DoubleRow tbody tr, table.HoverStandard tbody tr, .SearchResults tr, .results-table tr');
          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) continue;
            const ct = Array.from(cells).map(c => (c.textContent || '').trim());
            if (ct.every(t => !t)) continue;

            // Use detected headers if available, otherwise smart fallback
            if (Object.keys(headerMap).length >= 3) {
              records.push({
                grantor: ct[headerMap.grantor] || '',
                grantee: ct[headerMap.grantee] || '',
                instrumentType: ct[headerMap.type] || '',
                recordedDate: ct[headerMap.date] || '',
                instrumentNumber: ct[headerMap.number] || '',
                bookPage: headerMap.bvp !== undefined ? ct[headerMap.bvp] :
                  `${ct[headerMap.book] || bk}/${ct[headerMap.volume] || v}/${ct[headerMap.page] || ''}`,
                legalDescription: ct[headerMap.legal] || '',
                consideration: ct[headerMap.consideration] || '',
              });
            } else {
              // Fallback: try common TexasFile layout [#, Date, Type, Book, Vol, Page, Grantor, Grantee, Legal]
              // Detect by content patterns
              let dateIdx = -1, numIdx = -1;
              for (let i = 0; i < Math.min(ct.length, 8); i++) {
                if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(ct[i]) && dateIdx === -1) dateIdx = i;
                if (/^\d{4,}$/.test(ct[i]) && numIdx === -1) numIdx = i;
              }
              if (ct.length >= 8) {
                records.push({
                  instrumentNumber: ct[0] || '', recordedDate: ct[1] || '', instrumentType: ct[2] || '',
                  bookPage: `${ct[3] || bk}/${ct[4] || v}/${ct[5] || ''}`,
                  grantor: ct[6] || '', grantee: ct[7] || '', legalDescription: ct[8] || '',
                  consideration: ct[9] || '',
                });
              } else if (ct.length >= 6) {
                records.push({
                  instrumentNumber: ct[numIdx >= 0 ? numIdx : 0] || '',
                  recordedDate: ct[dateIdx >= 0 ? dateIdx : 1] || '',
                  instrumentType: ct[2] || '',
                  grantor: ct[ct.length - 3] || '', grantee: ct[ct.length - 2] || '',
                  legalDescription: ct[ct.length - 1] || '', bookPage: `${bk}/${v}`,
                  consideration: '',
                });
              }
            }
          }
        }

        // Method 3: Server.props.results
        if (records.length === 0 && window.Server?.props?.results) {
          const sr = window.Server.props.results;
          const arr = Array.isArray(sr) ? sr : (sr.results || []);
          for (const r of arr) {
            records.push({
              grantor: r.grantor || r.Grantor || '', grantee: r.grantee || r.Grantee || '',
              instrumentType: r.doc_type || r.type || '', recordedDate: r.date || r.recorded_date || '',
              bookPage: r.bvp || `${bk}/${v}`, legalDescription: r.legal || '',
              instrumentNumber: r.number || r.doc_number || '', consideration: r.consideration || '',
            });
          }
        }

        let totalOnPage = 0;
        const bt = document.body?.innerText || '';
        const tm = bt.match(/(\d[\d,]*)\s*(?:results?|records?|documents?|total)/i);
        if (tm) totalOnPage = parseInt(tm[1].replace(/,/g, ''), 10);
        const noResults = bt.includes('No results found') || bt.includes('no records') || bt.includes('0 results');

        // Debug: capture Bokeh keys and table headers
        let debugBokehKeys = [];
        let debugTableHeaders = [];
        try {
          if (window.Bokeh?.documents?.[0]) {
            const models = window.Bokeh.documents[0]._all_models || {};
            for (const [, m] of Object.entries(models)) {
              const d2 = m.data || (m.attributes && m.attributes.data);
              if (d2 && typeof d2 === 'object') { debugBokehKeys = Object.keys(d2); break; }
            }
          }
          const allTh = document.querySelectorAll('table th');
          debugTableHeaders = Array.from(allTh).map(th => th.textContent.trim()).filter(t => t);
        } catch {}
        const extractionMethod = records.length > 0 ? (debugBokehKeys.length > 0 ? 'bokeh' : 'html_table') : 'none';
        return { records, totalOnPage, noResults, url: window.location.href, debugBokehKeys, debugTableHeaders, headerMap, extractionMethod };
      }, msg.county, book, vol);

      console.log(`[TF-BR] ${msg.county}: Book=${book} Vol=${vol} => ${pageResults.records.length} records via ${pageResults.extractionMethod}, total=${pageResults.totalOnPage}, bokehKeys=${JSON.stringify(pageResults.debugBokehKeys)}, tableHeaders=${JSON.stringify(pageResults.debugTableHeaders)}, headerMap=${JSON.stringify(pageResults.headerMap)}`);

      if (pageResults.noResults && pageResults.records.length === 0) continue;

      if (pageResults.records.length > 0) {
        totalExtracted += pageResults.records.length;
        const normalized = pageResults.records.map((r, idx) => ({
          id: `TF_${msg.county}_${book}_${vol}_${idx}_${Date.now()}`,
          instrumentType: r.instrumentType || 'UNKNOWN', filingDate: r.recordedDate || '',
          recordedDate: r.recordedDate || '', grantor: r.grantor || '', grantee: r.grantee || '',
          legalDescription: r.legalDescription || '', bookPage: r.bookPage || `${book}/${vol}`,
          consideration: r.consideration || '', instrumentNumber: r.instrumentNumber || '',
        }));
        const result = { county: msg.county, instrumentType: `${book}_VOL_${vol}`, page: 0,
          records: normalized, totalFound: normalized.length, domTotal: pageResults.totalOnPage,
          timestamp: now(), platform: 'TEXASFILE', book, volume: vol };
        results.push(result);
        pendingUploads.push(uploadToR2(env, result));
      }

      // Pagination within volume results
      let hasNext = true, rp = 2;
      while (hasNext && rp <= 100) {
        const nextOk = await page.evaluate((rpg) => {
          const nb = document.querySelector('.Pagination-arrow:not(.is-disabled) a[aria-label*="next" i], a.next-page, .pagination .next:not(.disabled) a');
          if (nb) { nb.click(); return true; }
          const pls = document.querySelectorAll('.Pagination-number a, .pagination a');
          for (const pl of pls) { if (pl.textContent.trim() === String(rpg)) { pl.click(); return true; } }
          return false;
        }, rp);
        if (!nextOk) break;
        await humanDelay(1500, 3000);
        try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }); } catch {}

        const np = await page.evaluate((bk, v) => {
          const recs = []; const rows = document.querySelectorAll('table tbody tr');
          for (const row of rows) {
            const cells = row.querySelectorAll('td'); if (cells.length < 4) continue;
            const ct = Array.from(cells).map(c => (c.textContent || '').trim());
            if (ct.every(t => !t)) continue;
            recs.push({ grantor: ct[4]||ct[3]||'', grantee: ct[5]||ct[4]||'', instrumentType: ct[3]||ct[2]||'',
              recordedDate: ct[2]||ct[1]||'', bookPage: ct[6]||ct[5]||`${bk}/${v}`, legalDescription: ct[7]||ct[6]||'' });
          }
          return { records: recs };
        }, book, vol);

        if (np.records.length === 0) break;
        totalExtracted += np.records.length;
        const norm2 = np.records.map((r, idx) => ({
          id: `TF_${msg.county}_${book}_${vol}_p${rp}_${idx}_${Date.now()}`,
          instrumentType: r.instrumentType || 'UNKNOWN', filingDate: r.recordedDate || '',
          recordedDate: r.recordedDate || '', grantor: r.grantor || '', grantee: r.grantee || '',
          legalDescription: r.legalDescription || '', bookPage: r.bookPage || `${book}/${vol}`,
          consideration: '', instrumentNumber: '',
        }));
        const nr = { county: msg.county, instrumentType: `${book}_VOL_${vol}`, page: rp - 1,
          records: norm2, totalFound: norm2.length, timestamp: now(), platform: 'TEXASFILE', book, volume: vol };
        results.push(nr);
        pendingUploads.push(uploadToR2(env, nr));
        rp++;
        hasNext = np.records.length >= 20;
      }
      await humanDelay(500, 1000);
    }

    console.log(`[TF-BR] ${msg.county}: DONE extracted=${totalExtracted} batches=${results.length}`);
    if (pendingUploads.length > 0) await Promise.allSettled(pendingUploads);
  } finally { await browser.close(); }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXASFILE HTTP SCRAPER — No browser, no reCAPTCHA, pure fetch()
// ═══════════════════════════════════════════════════════════════════════════════
const TF_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Map bookCoverageDetails book_type (e.g. "OPR1") to form select value (e.g. "OR")
// bookCoverageDetails uses: OPR1, DR1, DT1, OGL1, FTL1, STL1, ML1, AJ1
// Form select uses: OR, DR, DT, OGL, FTL, STL, ML, LSE, PRO, BOS, REL
function tfBookToFormValue(book) {
  if (!book) return '';
  const stripped = book.replace(/\d+$/, ''); // strip trailing digits: OPR1→OPR, DR1→DR
  if (stripped === 'OPR') return 'OR'; // special case: OPR→OR
  return stripped;
}
// Reverse: form value (OR) → queue book code (OR) — for consistency

async function texasFileFetchLogin(env) {
  const email = env.TEXASFILE_EMAIL;
  const password = env.TEXASFILE_PASSWORD;
  if (!email || !password) {
    console.log('[TF-HTTP] No TEXASFILE_EMAIL / TEXASFILE_PASSWORD secrets');
    return null;
  }

  // Check KV for cached session (avoid repeated logins)
  const cached = await env.DEDUP_KV.get('texasfile_session', 'json').catch(() => null);
  if (cached && cached.sessionId && (Date.now() - cached.ts < 3600000)) {
    console.log(`[TF-HTTP] Using cached session (age=${Math.round((Date.now() - cached.ts) / 60000)}min)`);
    return cached;
  }

  try {
    // Step 1: GET homepage to get csrftoken + sessionid cookies
    // TexasFile /login/ redirects to /?login=beta (SPA modal)
    const homePage = await fetch('https://www.texasfile.com/?login=beta', {
      headers: { 'User-Agent': TF_UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      redirect: 'follow',
    });
    const homeHtml = await homePage.text();
    const homeCookies = homePage.headers.get('set-cookie') || '';
    const csrfCookie = homeCookies.match(/csrftoken=([^;]+)/)?.[1] || '';
    const initSession = homeCookies.match(/sessionid=([^;]+)/)?.[1] || '';

    if (!csrfCookie) {
      console.log('[TF-HTTP] No csrftoken cookie from homepage');
      return null;
    }
    console.log(`[TF-HTTP] Got csrf=${csrfCookie.substring(0,10)}... session=${initSession.substring(0,10)}...`);

    // Step 2: Try multiple login endpoints (TexasFile uses AJAX modal)
    const loginEndpoints = [
      { url: 'https://www.texasfile.com/login/', ct: 'application/x-www-form-urlencoded',
        body: new URLSearchParams({ csrfmiddlewaretoken: csrfCookie, username: email, password: password, next: '/search/' }).toString() },
      { url: 'https://www.texasfile.com/api/login/', ct: 'application/json',
        body: JSON.stringify({ username: email, password: password }) },
      { url: 'https://www.texasfile.com/accounts/login/', ct: 'application/x-www-form-urlencoded',
        body: new URLSearchParams({ csrfmiddlewaretoken: csrfCookie, login: email, password: password }).toString() },
      { url: 'https://www.texasfile.com/api/v1/auth/login/', ct: 'application/json',
        body: JSON.stringify({ email: email, password: password }) },
    ];

    for (const ep of loginEndpoints) {
      try {
        console.log(`[TF-HTTP] Trying POST ${ep.url}`);
        const resp = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': ep.ct,
            'Cookie': `csrftoken=${csrfCookie}; sessionid=${initSession}`,
            'X-CSRFToken': csrfCookie,
            'Referer': 'https://www.texasfile.com/?login=beta',
            'Origin': 'https://www.texasfile.com',
            'User-Agent': TF_UA,
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: ep.body,
          redirect: 'manual',
        });

        const status = resp.status;
        const postCookies = resp.headers.get('set-cookie') || '';
        const newSession = postCookies.match(/sessionid=([^;]+)/)?.[1] || '';
        const newCsrf = postCookies.match(/csrftoken=([^;]+)/)?.[1] || csrfCookie;

        console.log(`[TF-HTTP] ${ep.url} => status=${status} newSession=${newSession ? 'YES' : 'NO'}`);

        // 302 redirect = possible Django login success — verify by checking auth status
        if (status === 302 && newSession) {
          // Verify the session is actually authenticated by hitting search page
          try {
            const verifyResp = await fetch('https://www.texasfile.com/search/', {
              headers: { 'Cookie': `csrftoken=${newCsrf}; sessionid=${newSession}`, 'User-Agent': TF_UA, 'Accept': 'text/html' },
              redirect: 'follow',
            });
            const verifyHtml = await verifyResp.text();
            const authMatch = verifyHtml.match(/"is_authenticated":\s*(true|false)/);
            const isAuth = authMatch && authMatch[1] === 'true';
            console.log(`[TF-HTTP] ${ep.url} => 302+session, verified is_authenticated=${isAuth}`);
            if (isAuth) {
              const session = { csrfToken: newCsrf, csrfCookie: newCsrf, sessionId: newSession, ts: Date.now(), verified: true };
              await env.DEDUP_KV.put('texasfile_session', JSON.stringify(session), { expirationTtl: 3600 });
              console.log(`[TF-HTTP] Login VERIFIED via ${ep.url}`);
              return session;
            }
            // 302 + session but NOT authenticated — credentials might be wrong
            console.log(`[TF-HTTP] ${ep.url}: got session but NOT authenticated — trying next endpoint`);
          } catch (e) {
            console.log(`[TF-HTTP] Auth verify error: ${e.message}`);
            // Fall back to trusting the 302
            const session = { csrfToken: newCsrf, csrfCookie: newCsrf, sessionId: newSession, ts: Date.now(), verified: false };
            await env.DEDUP_KV.put('texasfile_session', JSON.stringify(session), { expirationTtl: 3600 });
            return session;
          }
        }

        // 200 with new session = also possible success (AJAX response)
        if (status === 200 && newSession) {
          const body = await resp.text();
          if (!body.includes('error') && !body.includes('invalid') && !body.includes('incorrect')) {
            const session = { csrfToken: newCsrf, csrfCookie: newCsrf, sessionId: newSession, ts: Date.now() };
            await env.DEDUP_KV.put('texasfile_session', JSON.stringify(session), { expirationTtl: 3600 });
            console.log(`[TF-HTTP] Login SUCCESS via ${ep.url} (200+session)`);
            return session;
          }
        }

        // 200 with JSON success flag
        if (status === 200) {
          const body = await resp.text();
          try {
            const j = JSON.parse(body);
            if (j.success || j.authenticated || j.token || j.key) {
              // Token-based auth
              const session = { csrfToken: newCsrf || csrfCookie, csrfCookie: newCsrf || csrfCookie,
                sessionId: newSession || initSession, token: j.token || j.key || '', ts: Date.now() };
              await env.DEDUP_KV.put('texasfile_session', JSON.stringify(session), { expirationTtl: 3600 });
              console.log(`[TF-HTTP] Login SUCCESS via ${ep.url} (JSON token)`);
              return session;
            }
          } catch {}
          // If HTML response, check for error indicators
          if (body.includes('Please enter a correct') || body.includes('Invalid credentials') || body.includes('invalid password')) {
            console.log(`[TF-HTTP] ${ep.url}: invalid credentials`);
            break; // Don't try other endpoints with wrong password
          }
        }
      } catch (e) {
        console.log(`[TF-HTTP] ${ep.url}: error ${e.message}`);
      }
    }

    // Step 3: Last resort — try using the initial session as-is
    // Some TexasFile counties allow search with just a session cookie
    if (initSession) {
      console.log('[TF-HTTP] All login endpoints failed, trying initial session as-is');
      const testResp = await fetch('https://www.texasfile.com/search/', {
        headers: { 'Cookie': `csrftoken=${csrfCookie}; sessionid=${initSession}`, 'User-Agent': TF_UA },
        redirect: 'manual',
      });
      if (testResp.status === 200 || testResp.status === 302) {
        const loc = testResp.headers.get('location') || testResp.url || '';
        if (!loc.includes('/login') && !loc.includes('/register')) {
          const session = { csrfToken: csrfCookie, csrfCookie, sessionId: initSession, ts: Date.now() };
          await env.DEDUP_KV.put('texasfile_session', JSON.stringify(session), { expirationTtl: 1800 });
          console.log('[TF-HTTP] Initial session works for search');
          return session;
        }
      }
    }

    console.log('[TF-HTTP] All login methods failed');
    return null;
  } catch (err) {
    console.error(`[TF-HTTP] Login error: ${err.message}`);
    return null;
  }
}

async function scrapeTexasFileHTTP(env, msg) {
  const county = msg.county;
  const book = msg.book || 'OR'; // Form value (not bookCoverageDetails OPR1)
  const volStart = msg.volumeStart || 1;
  const volEnd = msg.volumeEnd || volStart;
  const searchUrl = msg.baseUrl || `https://www.texasfile.com/search/texas/${county.toLowerCase().replace(/\s+/g, '-')}-county/county-clerk-records/`;

  const session = await texasFileFetchLogin(env);
  if (!session) {
    console.log(`[TF-HTTP] ${county}: Cannot scrape — login failed`);
    return [];
  }

  const results = [];
  const pendingUploads = [];
  const cookieStr = `csrftoken=${session.csrfCookie}; sessionid=${session.sessionId}`;

  // First GET the search page to extract the fresh CSRF token from the form
  let formCsrf = session.csrfToken;
  try {
    const searchPage = await fetch(searchUrl, {
      headers: { 'Cookie': cookieStr, 'User-Agent': TF_UA, 'Accept': 'text/html' },
    });
    const searchHtml = await searchPage.text();
    const fm = searchHtml.match(/name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/);
    if (fm) formCsrf = fm[1];
    // Also verify we're authenticated
    if (searchHtml.includes('/register/') && !searchHtml.includes('is_authenticated')) {
      console.log(`[TF-HTTP] ${county}: Not authenticated on search page — session may be invalid`);
      // Clear cached session and retry login
      await env.DEDUP_KV.delete('texasfile_session');
      const retry = await texasFileFetchLogin(env);
      if (!retry) return [];
    }
  } catch {}

  for (let vol = volStart; vol <= volEnd; vol++) {
    try {
      console.log(`[TF-HTTP] ${county}: Searching Book=${book} Vol=${vol}`);

      // POST search form
      const resp = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieStr,
          'Referer': searchUrl,
          'Origin': 'https://www.texasfile.com',
          'User-Agent': TF_UA,
        },
        body: new URLSearchParams({
          csrfmiddlewaretoken: formCsrf,
          'bvp-0-book': book,
          'bvp-0-volume': String(vol),
          'bvp-0-page': '',
          'OPR_VP': 'Search',
        }).toString(),
        redirect: 'follow',
      });

      const html = await resp.text();
      const finalUrl = resp.url;

      // Check auth redirect
      if (finalUrl.includes('/login') || finalUrl.includes('/register')) {
        console.log(`[TF-HTTP] ${county}: Auth redirect on Vol ${vol} — ${finalUrl}`);
        break;
      }

      let volRecords = [];

      // Method 1: Parse Server.props JSON from HTML
      const propsMatch = html.match(/Server\.props\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
      if (propsMatch) {
        try {
          const props = JSON.parse(propsMatch[1]);
          const sr = props.results || props.search_results || props.documents || [];
          const arr = Array.isArray(sr) ? sr : (sr.results || sr.data || []);
          for (const r of arr) {
            volRecords.push({
              grantor: r.grantor || r.Grantor || '',
              grantee: r.grantee || r.Grantee || '',
              instrumentType: r.doc_type || r.type || r.document_type || 'UNKNOWN',
              recordedDate: r.date || r.recorded_date || r.filed_date || '',
              instrumentNumber: r.number || r.doc_number || r.instrument_number || '',
              legalDescription: r.legal || r.legal_description || r.property || '',
              bookPage: r.bvp || `${book}/${vol}/${r.page || r.Page || ''}`,
              consideration: r.consideration || r.amount || '',
              downloadLink: r.image_link || r.download_url || r.pdf_url || '',
              docId: r.id || r.doc_id || '',
            });
          }
          console.log(`[TF-HTTP] ${county}: Vol ${vol} Server.props => ${volRecords.length} records`);
        } catch (e) { console.log(`[TF-HTTP] ${county}: JSON parse error: ${e.message}`); }
      }

      // Method 2: Parse Bokeh JSON data from HTML
      if (volRecords.length === 0) {
        const bokehMatch = html.match(/Bokeh\.safely\(function\(\)\s*\{[\s\S]*?Bokeh\.embed\.embed_items\((\[[\s\S]+?\])/);
        if (bokehMatch) {
          try {
            const items = JSON.parse(bokehMatch[1]);
            for (const item of items) {
              if (item.doc) {
                const doc = typeof item.doc === 'string' ? JSON.parse(item.doc) : item.doc;
                const roots = doc.roots || {};
                const refs = roots.references || doc.references || [];
                for (const ref of refs) {
                  if (ref.attributes?.data?.grantor || ref.attributes?.data?.Grantor) {
                    const d = ref.attributes.data;
                    const len = (d.grantor || d.Grantor || d.index || []).length;
                    for (let i = 0; i < len; i++) {
                      volRecords.push({
                        grantor: (d.grantor || d.Grantor || [])[i] || '',
                        grantee: (d.grantee || d.Grantee || [])[i] || '',
                        instrumentType: (d.doc_type || d.type || d.Type || [])[i] || '',
                        recordedDate: (d.date || d.Date || d.recorded_date || [])[i] || '',
                        instrumentNumber: (d.number || d.Number || d.doc_number || [])[i] || '',
                        legalDescription: (d.legal || d.Legal || [])[i] || '',
                        bookPage: `${book}/${vol}/${(d.page || d.Page || [])[i] || ''}`,
                        consideration: (d.consideration || d.amount || [])[i] || '',
                        downloadLink: (d.image_link || d.link || [])[i] || '',
                        docId: (d.id || d.doc_id || [])[i] || '',
                      });
                    }
                    break;
                  }
                }
              }
            }
            console.log(`[TF-HTTP] ${county}: Vol ${vol} Bokeh => ${volRecords.length} records`);
          } catch (e) { console.log(`[TF-HTTP] ${county}: Bokeh parse error: ${e.message}`); }
        }
      }

      // Method 3: HTML table fallback
      if (volRecords.length === 0) {
        const tableMatch = html.match(/<table[^>]*class="[^"]*(?:DoubleRow|HoverStandard|SearchResults)[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
        if (tableMatch) {
          const rowMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
          for (const rm of rowMatches) {
            const cells = [...rm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
            if (cells.length >= 4 && cells.some(c => c)) {
              volRecords.push({
                grantor: cells[4] || cells[3] || '', grantee: cells[5] || cells[4] || '',
                instrumentType: cells[3] || cells[2] || '', recordedDate: cells[2] || cells[1] || '',
                bookPage: cells[6] || `${book}/${vol}`, legalDescription: cells[7] || '',
                instrumentNumber: '', consideration: '', downloadLink: '', docId: '',
              });
            }
          }
          console.log(`[TF-HTTP] ${county}: Vol ${vol} HTML table => ${volRecords.length} records`);
        }
      }

      // Check total from page text
      if (volRecords.length === 0) {
        const totalMatch = html.match(/(\d[\d,]*)\s*(?:results?|records?|documents?|total)/i);
        const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0;
        const noResults = html.includes('No results found') || html.includes('no records') || html.includes('0 results');
        console.log(`[TF-HTTP] ${county}: Vol ${vol} — 0 parsed, pageTotal=${total}, noResults=${noResults}, htmlLen=${html.length}`);
      }

      if (volRecords.length > 0) {
        const normalized = volRecords.map((r, idx) => ({
          id: `TF_${county}_${book}_${vol}_${idx}_${Date.now()}`,
          instrumentType: r.instrumentType || 'UNKNOWN',
          filingDate: r.recordedDate || '', recordedDate: r.recordedDate || '',
          grantor: r.grantor || '', grantee: r.grantee || '',
          legalDescription: r.legalDescription || '', bookPage: r.bookPage || `${book}/${vol}`,
          consideration: r.consideration || '', instrumentNumber: r.instrumentNumber || '',
          downloadLink: r.downloadLink || '', docId: r.docId || '',
        }));
        const batch = {
          county, instrumentType: `${book}_VOL_${vol}`, page: 0,
          records: normalized, totalFound: normalized.length,
          timestamp: now(), platform: 'TEXASFILE', book, volume: vol,
        };
        results.push(batch);
        pendingUploads.push(uploadToR2(env, batch));
      }

      // Delay between volumes
      if (vol < volEnd) await new Promise(r => setTimeout(r, 300 + Math.random() * 700));
    } catch (err) {
      console.error(`[TF-HTTP] ${county}: Vol ${vol} error: ${err.message}`);
    }
  }

  if (pendingUploads.length > 0) await Promise.allSettled(pendingUploads);
  const totalRecords = results.reduce((s, r) => s + r.records.length, 0);
  console.log(`[TF-HTTP] ${county}: DONE ${totalRecords} records in ${results.length} batches`);
  return results;
}

async function discoverTexasFile(env, msg) {
  const browser = await launchBrowserWithRetry(env);
  const page = await browser.newPage();
  try {
    await applyBrowserEvasion(page);
    await page.setRequestInterception(true);
    page.on('request', req => { ['image','font','media'].includes(req.resourceType()) ? req.abort() : req.continue(); });

    // PRE-AUTH: Inject HTTP session cookie
    const httpSession = await texasFileFetchLogin(env);
    if (httpSession) {
      await page.setCookie(
        { name: 'csrftoken', value: httpSession.csrfCookie, domain: '.texasfile.com', path: '/', secure: true, sameSite: 'Lax' },
        { name: 'sessionid', value: httpSession.sessionId, domain: '.texasfile.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }
      );
    }

    await page.goto(msg.baseUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await humanDelay(1000, 2000);

    const coverage = await page.evaluate(() => {
      if (!window.Server?.props) return null;
      const p = window.Server.props;
      return {
        countyName: p.county?.name || '', indexStart: p.search?.index_start_date || '',
        indexEnd: p.search?.current_end_date || '', anonSearch: p.search?.allow_anon_search || false,
        books: (p.bookCoverageDetails || []).map(b => ({
          book: b.book_type || b.small_book_type || '', volStart: b.volume_start, volEnd: b.volume_end,
          startDate: b.start_date, endDate: b.end_date, current: b.current,
        })),
      };
    });
    if (!coverage) {
      console.log(`[TF DISCOVER] ${msg.county}: no Server.props`);
      return { instrumentType: msg.instrumentType || 'ALL', totalRecords: 0 };
    }

    let estimatedTotal = 0;
    const CHUNK_SIZE = 10;
    let queued = 0;
    for (const b of coverage.books) {
      if (!b.book) continue;
      const formBook = tfBookToFormValue(b.book); // OPR1→OR, DR1→DR, etc.
      if (!formBook) continue;
      const start = parseInt(b.volStart) || 1;
      const end = b.current ? TEXASFILE_OPR_MAX_ESTIMATE : (parseInt(b.volEnd) || start);
      const volumes = end - start + 1;
      estimatedTotal += volumes * 200;
      for (let vs = start; vs <= end; vs += CHUNK_SIZE) {
        const ve = Math.min(vs + CHUNK_SIZE - 1, end);
        await env.SCRAPE_QUEUE.send({
          type: 'scrape_batch', county: msg.county, countyId: msg.countyId,
          baseUrl: msg.baseUrl, instrumentType: `${formBook}_VOL_${vs}_${ve}`,
          instrumentTypeId: msg.instrumentTypeId, platform: 'TEXASFILE',
          book: formBook, volumeStart: vs, volumeEnd: ve, startPage: 0, endPage: 0,
        });
        queued++;
      }
    }
    console.log(`[TF DISCOVER] ${msg.county}: ${coverage.books.length} books, ~${estimatedTotal} est records, ${queued} jobs queued`);
    return { instrumentType: 'ALL', totalRecords: estimatedTotal, bookJobs: coverage.books.length, volumeChunks: queued };
  } finally { await browser.close(); }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PUBLICSEARCH SCRAPER — Dual-mode: Browser Rendering OR Relay              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const RECORDS_PER_PAGE = 50;

async function fetchViaRelay(relayUrl, targetUrl) {
  const identity = generateIdentity();
  const resp = await fetch(`${relayUrl}/browser`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-ShadowGlass': 'v8.0', 'User-Agent': identity.ua },
    body: JSON.stringify({ url: targetUrl, wait_for: 'table tbody tr', timeout: 25000 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => 'unknown');
    if (resp.status === 503 || resp.status === 502) throw new Error(`Relay unavailable (${resp.status}): ${errText}`);
    return null;
  }
  const data = await resp.json();
  return data.error ? null : data;
}

function extractRecords(resp) {
  if (resp.extracted && resp.extracted.length > 0) {
    return resp.extracted.map((item, idx) => {
      const parts = item.text.split('\t');
      return { id: parts[4] || `doc_${idx}_${Date.now()}`, grantor: parts[0] || '', grantee: parts[1] || '', instrumentType: parts[2] || '', recordedDate: parts[3] || '', filingDate: parts[3] || '', bookPage: parts[5] || '', legalDescription: parts[6] || '', consideration: '' };
    });
  }
  const html = resp.html || resp.content || '';
  return html ? parseRowsFromHtml(html) : [];
}

function parseDomTotalFromHtml(html) {
  let m = html.match(/(\d+)\s*-\s*(\d+)\s+of\s+([\d,]+)\s+results/i);
  if (m) return parseInt(m[3].replace(/,/g, ''), 10);
  m = html.match(/(?:total|found|showing)[:\s]*([\d,]+)\s*(?:results|records|documents)/i);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
}

function parseRowsFromHtml(html) {
  const records = [];
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const source = tbodyMatch ? tbodyMatch[1] : html;
  const rowChunks = source.split(/<tr\b/i).slice(1);
  for (let idx = 0; idx < rowChunks.length; idx++) {
    const rowHtml = rowChunks[idx];
    if (/<th\b/i.test(rowHtml)) continue;
    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) cells.push(stripHtml(cellMatch[1]));
    if (cells.length < 7) continue;
    const idMatch = rowHtml.match(/data-(?:id|doc-id|document-id)=["']([^"']+)["']/i);
    const grantor = cells[3] || '', grantee = cells[4] || '', docType = cells[5] || '', recordedDate = cells[6] || '', docNumber = cells[7] || '';
    if (!grantor && !grantee && !docType) continue;
    records.push({ id: idMatch ? idMatch[1] : docNumber || `doc_${idx}_${Date.now()}`, instrumentType: docType, filingDate: recordedDate, recordedDate, grantor, grantee, legalDescription: cells[9] || '', bookPage: cells[8] || '', consideration: '' });
  }
  return records;
}

function buildSearchUrl(baseUrl, instrumentType, page, dateRange) {
  // dateRange format: "MM/DD/YYYY,MM/DD/YYYY" or null/undefined for all dates
  const dateParam = dateRange || ',';
  return `${baseUrl}/results?department=RP&limit=${RECORDS_PER_PAGE}&offset=${page * RECORDS_PER_PAGE}&recordedDateRange=${encodeURIComponent(dateParam)}&searchOcrText=false&searchType=${encodeURIComponent(instrumentType)}`;
}

// PublicSearch batch scraper
async function scrapePublicSearchBatch(env, msg) {
  const results = [];
  const pendingUploads = [];
  const relayUrl = env.RELAY_URL;
  if (!relayUrl) throw new Error('RELAY_URL not configured for PublicSearch');

  const dateRange = msg.dateRange || null;
  const searchUrl = buildSearchUrl(msg.baseUrl, msg.instrumentType, msg.startPage, dateRange);
  const firstPage = await fetchViaRelay(relayUrl, searchUrl);
  if (!firstPage) throw new Error(`Relay returned empty for page ${msg.startPage}`);
  const firstPageHtml = firstPage.html || firstPage.content || '';
  const domTotal = parseDomTotalFromHtml(firstPageHtml);
  let records = extractRecords(firstPage);
  if (records.length > 0) {
    const result = { county: msg.county, instrumentType: msg.instrumentType, page: msg.startPage, records, totalFound: records.length, domTotal, dateRange: msg.dateRange || null, timestamp: new Date().toISOString() };
    results.push(result);
    pendingUploads.push(uploadToR2(env, result));
  }
  const totalPages = domTotal > 0 ? Math.ceil(domTotal / RECORDS_PER_PAGE) : msg.endPage + 1;
  let consecutiveEmpty = 0, batchRecordCount = records.length;
  for (let pg = msg.startPage + 1; pg <= Math.min(msg.endPage, totalPages - 1); pg++) {
    if (domTotal > 0 && pg * RECORDS_PER_PAGE >= domTotal) break;
    if (consecutiveEmpty >= 3) break;
    await humanDelay(200, 500);
    const pageResp = await fetchViaRelay(relayUrl, buildSearchUrl(msg.baseUrl, msg.instrumentType, pg, dateRange));
    if (!pageResp) { consecutiveEmpty++; continue; }
    const pageRecords = extractRecords(pageResp);
    if (pageRecords.length === 0) { consecutiveEmpty++; continue; }
    consecutiveEmpty = 0;
    batchRecordCount += pageRecords.length;
    const pr = { county: msg.county, instrumentType: msg.instrumentType, page: pg, records: pageRecords, totalFound: pageRecords.length, domTotal, dateRange: msg.dateRange || null, timestamp: new Date().toISOString() };
    results.push(pr);
    pendingUploads.push(uploadToR2(env, pr));
  }
  await Promise.allSettled(pendingUploads);
  await batchUpdateCheckpoint(env, msg, batchRecordCount, domTotal, results.length > 0 ? results[results.length - 1].page : msg.startPage);
  return results;
}

// Unified scrape dispatcher — Browser Rendering > Relay > Error
async function scrapeBatch(env, msg) {
  if (msg.platform === 'TYLER_TECH') return scrapeTylerBatch(env, msg);
  if (msg.platform === 'TEXASFILE') {
    // Browser with pre-injected HTTP session (HTTP login bypasses reCAPTCHA, browser handles JS search)
    if (!env.BROWSER) throw new Error('TEXASFILE requires BROWSER binding');
    return scrapeTexasFileBrowser(env, msg);
  }
  if (env.BROWSER) return scrapePublicSearchBrowser(env, msg);
  if (env.RELAY_URL) return scrapePublicSearchBatch(env, msg);
  throw new Error('PublicSearch requires BROWSER binding or RELAY_URL');
}

// Unified discovery dispatcher — Browser Rendering > Relay > Error
// When totalRecords >= DATE_PARTITION_THRESHOLD and no dateRange set, auto-splits into date partitions
async function discoverCounty(env, msg) {
  if (msg.platform === 'TYLER_TECH') return discoverTyler(env, msg);
  if (msg.platform === 'TEXASFILE') {
    if (!env.BROWSER) throw new Error('TEXASFILE requires BROWSER binding');
    return discoverTexasFile(env, msg);
  }

  // Get total count for this instrument type (with or without dateRange)
  let totalRecords = 0;
  const dateRange = msg.dateRange || null;
  if (env.BROWSER) {
    const result = await discoverPublicSearchBrowser(env, msg);
    totalRecords = result.totalRecords;
  } else if (env.RELAY_URL) {
    const resp = await fetchViaRelay(env.RELAY_URL, buildSearchUrl(msg.baseUrl, msg.instrumentType, 0, dateRange));
    if (!resp) return { instrumentType: msg.instrumentType, totalRecords: 0 };
    totalRecords = parseDomTotalFromHtml(resp.html || resp.content || '');
  } else {
    throw new Error('PublicSearch requires BROWSER binding or RELAY_URL');
  }

  // If this is already a date-partitioned discovery, return the count directly
  if (dateRange) {
    console.log(`[DISCOVERY] ${msg.county}/${msg.instrumentType} dateRange=${dateRange}: ${totalRecords} records`);
    return { instrumentType: msg.instrumentType, totalRecords, dateRange };
  }

  // Auto-partition: if total >= threshold and no dateRange, split into date ranges
  if (totalRecords >= DATE_PARTITION_THRESHOLD) {
    console.log(`[DISCOVERY] ${msg.county}/${msg.instrumentType}: ${totalRecords} records >= ${DATE_PARTITION_THRESHOLD} — AUTO-PARTITIONING into ${DATE_PARTITIONS.length} date ranges`);

    let partitionedTotal = 0;
    for (const partition of DATE_PARTITIONS) {
      const partDateRange = `${partition.from},${partition.to}`;
      await env.SCRAPE_QUEUE.send({
        type: 'discovery',
        county: msg.county,
        countyId: msg.countyId,
        baseUrl: msg.baseUrl,
        instrumentType: msg.instrumentType,
        instrumentTypeId: msg.instrumentTypeId,
        startPage: 0,
        endPage: 0,
        platform: msg.platform || 'PUBLICSEARCH',
        dateRange: partDateRange,
        dateLabel: partition.label,
        parentDiscovery: true,
      });
    }
    // Return the unpartitioned total so the job record reflects the real count
    return { instrumentType: msg.instrumentType, totalRecords, autoPartitioned: true, partitions: DATE_PARTITIONS.length };
  }

  console.log(`[DISCOVERY] ${msg.county}/${msg.instrumentType}: ${totalRecords} records (under threshold, no partitioning needed)`);
  return { instrumentType: msg.instrumentType, totalRecords };
}

// PublicSearch R2 upload
async function uploadToR2(env, result) {
  const key = `ENCORE/${result.county}/${result.instrumentType.replace(/ /g,'_')}/page_${String(result.page).padStart(6,'0')}.json`;
  await env.R2_RECORDS.put(key, JSON.stringify(result), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { county: result.county, instrumentType: result.instrumentType, page: String(result.page), recordCount: String(result.records.length), scrapedAt: result.timestamp },
  });
  try { await env.DB.prepare(`INSERT OR REPLACE INTO r2_uploads (r2_key, county_id, file_size, content_type, uploaded_at) VALUES (?, (SELECT id FROM counties WHERE UPPER(name) = UPPER(?)), ?, 'application/json', datetime('now'))`).bind(key, result.county, JSON.stringify(result).length).run(); } catch {}
}

async function batchUpdateCheckpoint(env, msg, totalRecordsScraped, domTotal, lastPage) {
  try {
    const sql = domTotal > 0
      ? `UPDATE scrape_jobs SET last_page = ?, scraped_records = scraped_records + ?, total_records = ?, updated_at = datetime('now'), status = 'running' WHERE county_id = ? AND instrument_type_id = ?`
      : `UPDATE scrape_jobs SET last_page = ?, scraped_records = scraped_records + ?, updated_at = datetime('now'), status = 'running' WHERE county_id = ? AND instrument_type_id = ?`;
    const binds = domTotal > 0 ? [lastPage, totalRecordsScraped, domTotal, msg.countyId, msg.instrumentTypeId] : [lastPage, totalRecordsScraped, msg.countyId, msg.instrumentTypeId];
    await env.DB.prepare(sql).bind(...binds).run();
  } catch {}
}

async function logDebug(env, msg, message) {
  try { await env.DB.prepare(`INSERT INTO scrape_logs (job_id, level, message, metadata, created_at) VALUES ((SELECT id FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?), 'debug', ?, ?, datetime('now'))`).bind(msg.countyId, msg.instrumentTypeId, message, JSON.stringify({ county: msg.county, type: msg.instrumentType })).run(); } catch {}
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  INSTRUMENT TYPES + RATE LIMITER                                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const INSTRUMENT_TYPES = [
  'DEED','WARRANTY DEED','MINERAL DEED','OIL AND GAS LEASE','DEED OF TRUST',
  'RELEASE','ASSIGNMENT','AMENDMENT','EASEMENT','RIGHT OF WAY','LIEN',
  'ABSTRACT OF JUDGMENT','POWER OF ATTORNEY','PLAT','AFFIDAVIT','ROYALTY DEED',
  'CORRECTION DEED','AFFIDAVIT OF HEIRSHIP','UCC FILING','LIS PENDENS','RATIFICATION',
  // v8.1 — 11 new from Reeves County analysis
  'BILL OF SALE','FIELD NOTES','MINERAL SURVEY','PATENT','PROBATE',
  'FEDERAL TAX LIEN','STATE TAX LIEN','MINERAL APPLICATION','PERMIT',
  'TRANSFER OF LIEN','ASSUMED NAME',
  // v9.0 — 6 critical types for chain-of-title completeness
  'QUIT CLAIM DEED','CONVEYANCE','MEMORANDUM','SURFACE LEASE',
  'POOLING AGREEMENT','UNITIZATION ORDER',
  // v9.1 — 18 new from Master Title Chain Research 2026 (65+ type taxonomy)
  'GIFT DEED','EXECUTORS DEED','TRUSTEES DEED','GUARDIANS DEED',
  'TAX DEED','TRANSFER ON DEATH DEED','PARTITION DEED','LIFE ESTATE DEED',
  'CONTRACT FOR DEED','DEED IN LIEU','TOP LEASE','LEASE RELEASE',
  'CONSERVATION EASEMENT','CODICIL','DETERMINATION OF HEIRSHIP',
  'SMALL ESTATE AFFIDAVIT','AFFIDAVIT OF IDENTITY','DIVISION ORDER',
];
const PAGES_PER_BATCH = 1;

class RateLimiter {
  constructor(kv, maxPerMin = 10, maxConcurrent = 3) { this.kv = kv; this.maxPerMin = maxPerMin; this.maxConcurrent = maxConcurrent; }
  async canProceed() {
    const minute = Math.floor(Date.now() / 60000);
    const key = `ratelimit:${minute}`;
    const current = parseInt(await this.kv.get(key) || '0');
    if (current >= this.maxPerMin) return false;
    await this.kv.put(key, String(current + 1), { expirationTtl: 120 });
    return true;
  }
  async acquireBrowser() {
    const key = 'concurrent:browsers';
    const current = parseInt(await this.kv.get(key) || '0');
    if (current >= this.maxConcurrent) return false;
    await this.kv.put(key, String(current + 1), { expirationTtl: 300 });
    return true;
  }
  async releaseBrowser() {
    const key = 'concurrent:browsers';
    const current = parseInt(await this.kv.get(key) || '0');
    await this.kv.put(key, String(Math.max(0, current - 1)), { expirationTtl: 300 });
  }
}

// ═══ Browser Launch with Retry — handles "Requesting main frame too early!" ═══
async function launchBrowserWithRetry(env, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const browser = await puppeteer.launch(env.BROWSER);
      return browser;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('main frame') || msg.includes('too early') || msg.includes('Could not start')) {
        const backoff = (attempt + 1) * 2000 + Math.random() * 1000;
        console.log(`[BROWSER] Launch attempt ${attempt + 1}/${maxRetries} failed: ${msg}. Retrying in ${Math.round(backoff)}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw err; // non-retryable error
    }
  }
  throw new Error(`Browser launch failed after ${maxRetries} attempts`);
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HELPER FUNCTIONS                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function now() { return new Date().toISOString(); }
function json(data, status, headers) { return new Response(JSON.stringify(data, null, 2), { status, headers: { 'Content-Type': 'application/json', ...headers } }); }

async function getStats(env) {
  const stats = await env.DB.prepare(`SELECT COUNT(*) as totalJobs, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completedJobs, SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as runningJobs, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failedJobs, SUM(total_records) as totalRecords, SUM(scraped_records) as scrapedRecords FROM scrape_jobs`).first();
  const r2Count = await env.DB.prepare('SELECT COUNT(*) as count FROM r2_uploads').first();
  const countyCount = await env.DB.prepare("SELECT COUNT(*) as count FROM counties WHERE is_active = 1").first();
  // Circuit breaker stats
  const cbStats = {};
  for (const [name, cb] of circuitBreakers) cbStats[name] = { state: cb.state, failures: cb.failures };
  return { ok: true, data: { version: VERSION, codename: CODENAME, evasionEngine: 'v8 OMEGA (30 UAs, matched Sec-CH-UA, 4 Accept sets, proxy routing, circuit breakers)', jobs: stats, r2Uploads: r2Count?.count || 0, activeCounties: countyCount?.count || 0, circuitBreakers: cbStats, tylerCountiesBuiltIn: Object.keys(TYLER_COUNTIES).length, limits: { maxConcurrentBrowsers: 3, maxBrowsersPerMinute: 10, restApiPerMinute: 180 } }, timestamp: now() };
}

async function getAllJobStatuses(env) {
  const { results } = await env.DB.prepare(`SELECT j.id, c.name as county, i.name as instrumentType, j.status, j.total_records as totalRecords, j.scraped_records as scrapedRecords, j.last_page as lastPage FROM scrape_jobs j JOIN counties c ON j.county_id = c.id JOIN instrument_types i ON j.instrument_type_id = i.id ORDER BY j.updated_at DESC LIMIT 200`).all();
  const jobs = (results || []).map(r => ({ id: r.id, county: r.county, instrumentType: r.instrumentType, status: r.status, totalRecords: r.totalRecords || 0, scrapedRecords: r.scrapedRecords || 0, lastPage: r.lastPage || 0, progress: r.totalRecords > 0 ? Math.round((r.scrapedRecords / r.totalRecords) * 100) : 0 }));
  return { ok: true, data: jobs, timestamp: now() };
}

async function getCountyJobStatuses(env, county) {
  const { results } = await env.DB.prepare(`SELECT j.id, c.name as county, i.name as instrumentType, j.status, j.total_records as totalRecords, j.scraped_records as scrapedRecords, j.last_page as lastPage FROM scrape_jobs j JOIN counties c ON j.county_id = c.id JOIN instrument_types i ON j.instrument_type_id = i.id WHERE UPPER(c.name) = UPPER(?) ORDER BY j.updated_at DESC`).bind(county).all();
  const jobs = (results || []).map(r => ({ id: r.id, county: r.county, instrumentType: r.instrumentType, status: r.status, totalRecords: r.totalRecords || 0, scrapedRecords: r.scrapedRecords || 0, lastPage: r.lastPage || 0, progress: r.totalRecords > 0 ? Math.round((r.scrapedRecords / r.totalRecords) * 100) : 0 }));
  return { ok: true, data: jobs, timestamp: now() };
}

async function searchRecords(env, params) {
  let sql = 'SELECT * FROM deed_records WHERE 1=1';
  const binds = [];
  if (params.county) { sql += ' AND UPPER(county) = UPPER(?)'; binds.push(params.county); }
  if (params.instrumentType) { sql += ' AND UPPER(instrument_type) = UPPER(?)'; binds.push(params.instrumentType); }
  if (params.grantor) { sql += ' AND grantor LIKE ?'; binds.push(`%${params.grantor}%`); }
  if (params.grantee) { sql += ' AND grantee LIKE ?'; binds.push(`%${params.grantee}%`); }
  if (params.dateFrom) { sql += ' AND recorded_date >= ?'; binds.push(params.dateFrom); }
  if (params.dateTo) { sql += ' AND recorded_date <= ?'; binds.push(params.dateTo); }
  sql += ' ORDER BY recorded_date DESC LIMIT ? OFFSET ?';
  binds.push(params.limit || 50, params.offset || 0);
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  // Also return total count for pagination
  let countSql = 'SELECT COUNT(*) as total FROM deed_records WHERE 1=1';
  const countBinds = [];
  if (params.county) { countSql += ' AND UPPER(county) = UPPER(?)'; countBinds.push(params.county); }
  if (params.instrumentType) { countSql += ' AND UPPER(instrument_type) = UPPER(?)'; countBinds.push(params.instrumentType); }
  if (params.grantor) { countSql += ' AND grantor LIKE ?'; countBinds.push(`%${params.grantor}%`); }
  if (params.grantee) { countSql += ' AND grantee LIKE ?'; countBinds.push(`%${params.grantee}%`); }
  if (params.dateFrom) { countSql += ' AND recorded_date >= ?'; countBinds.push(params.dateFrom); }
  if (params.dateTo) { countSql += ' AND recorded_date <= ?'; countBinds.push(params.dateTo); }
  const countResult = countBinds.length > 0
    ? await env.DB.prepare(countSql).bind(...countBinds).first()
    : await env.DB.prepare(countSql).first();
  return { ok: true, data: results, total: countResult?.total || 0, timestamp: now() };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  JOB SUBMISSION + QUEUE MANAGEMENT                                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function submitScrapeJob(env, countyName, instrumentType, startPage) {
  const county = await env.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(countyName.toUpperCase()).first();
  if (!county) return { ok: false, error: `County "${countyName}" not found`, timestamp: now() };
  const instType = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instrumentType.toUpperCase()).first();
  if (!instType) return { ok: false, error: `Instrument type "${instrumentType}" not found`, timestamp: now() };
  const platform = county.platform || 'PUBLICSEARCH';
  await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, last_page, started_at, updated_at) VALUES (?, ?, 'running', ?, datetime('now'), datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET status='running', last_page=?, started_at=datetime('now'), updated_at=datetime('now')`).bind(county.id, instType.id, startPage, startPage).run();
  await env.SCRAPE_QUEUE.send({ type: 'discovery', county: countyName.toUpperCase(), countyId: county.id, baseUrl: county.base_url, instrumentType: instrumentType.toUpperCase(), instrumentTypeId: instType.id, startPage, endPage: startPage, platform });
  return { ok: true, data: { message: `Scrape queued: ${countyName}/${instrumentType} [${platform}]`, startPage }, timestamp: now() };
}

async function submitAllInstruments(env, countyName) {
  const county = await env.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(countyName.toUpperCase()).first();
  if (!county) return { ok: false, error: `County "${countyName}" not found`, timestamp: now() };
  const platform = county.platform || 'PUBLICSEARCH';
  // TexasFile uses scrape_batch with book/volume params, not discovery
  if (platform === 'TEXASFILE') {
    const book = 'OR'; // Form value for Official Records (bookCoverageDetails calls it "OPR1")
    let inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind('TF_OR').first();
    if (!inst) {
      await env.DB.prepare("INSERT OR IGNORE INTO instrument_types (name, code) VALUES (?, ?)").bind('TF_OR', 'TF_OR').run();
      inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind('TF_OR').first();
    }
    if (inst) {
      await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, started_at, updated_at) VALUES (?, ?, 'running', datetime('now'), datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET status='running', started_at=datetime('now'), updated_at=datetime('now')`).bind(county.id, inst.id).run();
    }
    const CHUNK = 10, MAX_VOL = 200;
    let queued = 0;
    for (let vs = 1; vs <= MAX_VOL; vs += CHUNK) {
      const ve = Math.min(vs + CHUNK - 1, MAX_VOL);
      await env.SCRAPE_QUEUE.send({
        type: 'scrape_batch', county: countyName.toUpperCase(), countyId: county.id,
        baseUrl: county.base_url, instrumentType: `${book}_VOL_${vs}_${ve}`,
        instrumentTypeId: inst?.id || 0, platform: 'TEXASFILE',
        book, volumeStart: vs, volumeEnd: ve, startPage: 0, endPage: 0,
      });
      queued++;
    }
    return { ok: true, data: { message: `${queued} TexasFile volume batches queued for ${countyName} [TEXASFILE]`, book, volumeRange: '1-200' }, timestamp: now() };
  }
  let queued = 0;
  for (const instType of INSTRUMENT_TYPES) {
    const inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instType).first();
    if (!inst) continue;
    await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, started_at, updated_at) VALUES (?, ?, 'running', datetime('now'), datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET status='running', started_at=datetime('now'), updated_at=datetime('now')`).bind(county.id, inst.id).run();
    await env.SCRAPE_QUEUE.send({ type: 'discovery', county: countyName.toUpperCase(), countyId: county.id, baseUrl: county.base_url, instrumentType: instType, instrumentTypeId: inst.id, startPage: 0, endPage: 0, platform });
    queued++;
  }
  return { ok: true, data: { message: `${queued} instruments queued for ${countyName} [${platform}]` }, timestamp: now() };
}

async function submitMultiCounty(env, counties) {
  const results = {};
  for (const countyName of counties) {
    const county = await env.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(countyName.toUpperCase()).first();
    if (!county) { results[countyName] = { error: 'Not found' }; continue; }
    const platform = county.platform || 'PUBLICSEARCH';
    // TexasFile uses scrape_batch with book/volume params, not discovery
    if (platform === 'TEXASFILE') {
      const book = 'OR'; // Form value for Official Records
      let inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind('TF_OR').first();
      if (!inst) {
        await env.DB.prepare("INSERT OR IGNORE INTO instrument_types (name, code) VALUES (?, ?)").bind('TF_OR', 'TF_OR').run();
        inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind('TF_OR').first();
      }
      if (inst) {
        await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, started_at, updated_at) VALUES (?, ?, 'running', datetime('now'), datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET status='running', started_at=datetime('now'), updated_at=datetime('now')`).bind(county.id, inst.id).run();
      }
      const CHUNK = 10, MAX_VOL = 200;
      let queued = 0;
      for (let vs = 1; vs <= MAX_VOL; vs += CHUNK) {
        const ve = Math.min(vs + CHUNK - 1, MAX_VOL);
        await env.SCRAPE_QUEUE.send({
          type: 'scrape_batch', county: countyName.toUpperCase(), countyId: county.id,
          baseUrl: county.base_url, instrumentType: `${book}_VOL_${vs}_${ve}`,
          instrumentTypeId: inst?.id || 0, platform: 'TEXASFILE',
          book, volumeStart: vs, volumeEnd: ve, startPage: 0, endPage: 0,
        });
        queued++;
      }
      results[countyName] = { queued, platform: 'TEXASFILE' };
      continue;
    }
    let queued = 0;
    for (const instType of INSTRUMENT_TYPES) {
      const inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instType).first();
      if (!inst) continue;
      await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, started_at, updated_at) VALUES (?, ?, 'running', datetime('now'), datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET status='running', started_at=datetime('now'), updated_at=datetime('now')`).bind(county.id, inst.id).run();
      await env.SCRAPE_QUEUE.send({ type: 'discovery', county: countyName.toUpperCase(), countyId: county.id, baseUrl: county.base_url, instrumentType: instType, instrumentTypeId: inst.id, startPage: 0, endPage: 0, platform });
      queued++;
    }
    results[countyName] = { queued, platform };
  }
  return { ok: true, data: { message: 'Multi-county scrape queued', results }, timestamp: now() };
}

async function submitDiscovery(env, countyName) {
  const county = await env.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(countyName.toUpperCase()).first();
  if (!county) return { ok: false, error: `County "${countyName}" not found`, timestamp: now() };
  const platform = county.platform || 'PUBLICSEARCH';
  // TexasFile uses scrape_batch with book/volume params, not discovery
  if (platform === 'TEXASFILE') {
    const book = 'OR'; // Form value for Official Records
    let inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind('TF_OR').first();
    if (!inst) {
      await env.DB.prepare("INSERT OR IGNORE INTO instrument_types (name, code) VALUES (?, ?)").bind('TF_OR', 'TF_OR').run();
      inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind('TF_OR').first();
    }
    if (inst) {
      await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, started_at, updated_at) VALUES (?, ?, 'running', datetime('now'), datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET status='running', started_at=datetime('now'), updated_at=datetime('now')`).bind(county.id, inst.id).run();
    }
    const CHUNK = 10, MAX_VOL = 200;
    let queued = 0;
    for (let vs = 1; vs <= MAX_VOL; vs += CHUNK) {
      const ve = Math.min(vs + CHUNK - 1, MAX_VOL);
      await env.SCRAPE_QUEUE.send({
        type: 'scrape_batch', county: countyName.toUpperCase(), countyId: county.id,
        baseUrl: county.base_url, instrumentType: `${book}_VOL_${vs}_${ve}`,
        instrumentTypeId: inst?.id || 0, platform: 'TEXASFILE',
        book, volumeStart: vs, volumeEnd: ve, startPage: 0, endPage: 0,
      });
      queued++;
    }
    return { ok: true, data: { message: `${queued} TexasFile volume batches queued for ${countyName} [TEXASFILE]`, book, volumeRange: '1-200' }, timestamp: now() };
  }
  let queued = 0;
  for (const instType of INSTRUMENT_TYPES) {
    const inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instType).first();
    if (!inst) continue;
    await env.SCRAPE_QUEUE.send({ type: 'discovery', county: countyName.toUpperCase(), countyId: county.id, baseUrl: county.base_url, instrumentType: instType, instrumentTypeId: inst.id, startPage: 0, endPage: 0, platform });
    queued++;
  }
  return { ok: true, data: { message: `Discovery queued: ${queued} instruments in ${countyName} [${platform}]` }, timestamp: now() };
}

async function pauseJob(env, jobId) {
  await env.DB.prepare("UPDATE scrape_jobs SET status='paused', updated_at=datetime('now') WHERE id=?").bind(jobId).run();
  return { ok: true, data: { message: `Job ${jobId} paused` }, timestamp: now() };
}

async function resumeJob(env, jobId) {
  const job = await env.DB.prepare(`SELECT j.*, c.name as county_name, c.base_url, c.platform, i.name as inst_name FROM scrape_jobs j JOIN counties c ON j.county_id = c.id JOIN instrument_types i ON j.instrument_type_id = i.id WHERE j.id = ?`).bind(jobId).first();
  if (!job) return { ok: false, error: `Job ${jobId} not found`, timestamp: now() };
  await env.DB.prepare("UPDATE scrape_jobs SET status='running', updated_at=datetime('now') WHERE id=?").bind(jobId).run();
  const platform = job.platform || 'PUBLICSEARCH';
  const totalPages = Math.ceil(job.total_records / 50);
  await enqueueBatches(env, { type: 'scrape_batch', county: job.county_name, countyId: job.county_id, baseUrl: job.base_url, instrumentType: job.inst_name, instrumentTypeId: job.instrument_type_id, startPage: job.last_page, endPage: totalPages, platform }, totalPages);
  return { ok: true, data: { message: `Job ${jobId} resumed from page ${job.last_page} [${platform}]` }, timestamp: now() };
}

async function enqueueBatches(env, msg, totalPages, batchSize) {
  const pagesPerBatch = batchSize || PAGES_PER_BATCH;
  const batchMessages = [];
  for (let start = msg.startPage; start < totalPages; start += pagesPerBatch) {
    batchMessages.push({ body: { ...msg, type: 'scrape_batch', startPage: start, endPage: Math.min(start + pagesPerBatch - 1, totalPages - 1) } });
  }
  for (let i = 0; i < batchMessages.length; i += 100) {
    await env.SCRAPE_QUEUE.sendBatch(batchMessages.slice(i, i + 100));
  }
}

async function chainNextJob(env, completedCountyId) {
  try {
    const county = await env.DB.prepare("SELECT id, name, base_url, platform FROM counties WHERE id = ?").bind(completedCountyId).first();
    if (!county) return;
    const platform = county.platform || 'PUBLICSEARCH';
    for (const instTypeName of INSTRUMENT_TYPES) {
      const instType = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instTypeName).first();
      if (!instType) continue;
      const existing = await env.DB.prepare("SELECT status FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?").bind(county.id, instType.id).first();
      if (existing && (existing.status === 'completed' || existing.status === 'running')) continue;
      await env.SCRAPE_QUEUE.send({ type: 'discovery', county: county.name, countyId: county.id, baseUrl: county.base_url, instrumentType: instTypeName, instrumentTypeId: instType.id, startPage: 0, endPage: 0, platform });
      return;
    }
    const nextCounty = await env.DB.prepare(`SELECT c.id, c.name, c.base_url, c.platform FROM counties c WHERE c.is_active = 1 AND c.id > ? AND c.id NOT IN (SELECT DISTINCT county_id FROM scrape_jobs WHERE status = 'running') ORDER BY c.id LIMIT 1`).bind(completedCountyId).first();
    if (nextCounty) {
      const firstInst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(INSTRUMENT_TYPES[0]).first();
      if (firstInst) await env.SCRAPE_QUEUE.send({ type: 'discovery', county: nextCounty.name, countyId: nextCounty.id, baseUrl: nextCounty.base_url, instrumentType: INSTRUMENT_TYPES[0], instrumentTypeId: firstInst.id, startPage: 0, endPage: 0, platform: nextCounty.platform || 'PUBLICSEARCH' });
    }
  } catch {}
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  DASHBOARD v8 — WARP SPEED CLOUD                                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ShadowGlass v8.1 — WARP SPEED ULTIMATE</title>
<style>
:root{--bg:#0a0e17;--card:#111827;--border:#1e293b;--accent:#06b6d4;--green:#10b981;--red:#ef4444;--orange:#f59e0b;--text:#e2e8f0;--muted:#64748b}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'JetBrains Mono','Fira Code',monospace;background:var(--bg);color:var(--text);min-height:100vh}
.container{max-width:1400px;margin:0 auto;padding:2rem}
h1{font-size:1.8rem;color:var(--accent);margin-bottom:0.5rem}
.subtitle{color:var(--muted);margin-bottom:2rem;font-size:0.9rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem;margin-bottom:2rem}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.5rem}
.card h3{color:var(--accent);margin-bottom:1rem;font-size:1rem}
.stat{font-size:2.5rem;font-weight:bold;color:var(--green)}
.stat-label{color:var(--muted);font-size:0.8rem;margin-top:0.3rem}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:0.75rem;border-bottom:1px solid var(--border);font-size:0.85rem}
th{color:var(--accent);font-weight:600}
.badge{padding:0.2rem 0.6rem;border-radius:999px;font-size:0.75rem;font-weight:600}
.badge.running{background:#1e3a5f;color:#60a5fa}.badge.completed,.badge.complete{background:#064e3b;color:#34d399}
.badge.failed,.badge.error{background:#450a0a;color:#fca5a5}.badge.pending{background:#3b3820;color:#fbbf24}
.badge.paused{background:#3b2f20;color:#fb923c}
.progress-bar{background:var(--border);border-radius:4px;height:6px;overflow:hidden}
.progress-fill{background:var(--green);height:100%;transition:width 0.3s}
.btn{background:var(--accent);color:var(--bg);border:none;padding:0.6rem 1.2rem;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:bold;font-size:0.85rem}
.btn:hover{opacity:0.85}.btn.green{background:var(--green)}.btn.orange{background:var(--orange)}.btn.red{background:var(--red)}
.btn.sm{padding:0.3rem 0.6rem;font-size:0.75rem}
.form-row{display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center}
.form-row input,.form-row select{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.5rem 0.75rem;border-radius:6px;font-family:inherit;font-size:0.85rem}
.form-row select{min-width:160px}
#log{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:1rem;height:180px;overflow-y:auto;font-size:0.8rem;color:var(--green);white-space:pre-wrap;line-height:1.5}
.tabs{display:flex;gap:0;margin-bottom:0;border-bottom:2px solid var(--border)}
.tab{padding:0.6rem 1.2rem;cursor:pointer;color:var(--muted);font-size:0.85rem;border-bottom:2px solid transparent;margin-bottom:-2px}
.tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.tab-content{display:none}.tab-content.active{display:block}
.search-row{display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap}
.search-row input{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.5rem 0.75rem;border-radius:6px;font-family:inherit;font-size:0.85rem;flex:1;min-width:140px}
.evasion-badge{background:#1a1a3e;color:#a78bfa;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.7rem;margin-right:0.3rem}
</style></head><body><div class="container">
<h1>⬡ SHADOWGLASS v8.1 — WARP SPEED ULTIMATE</h1>
<p class="subtitle">
  <span class="evasion-badge">30 UAs</span>
  <span class="evasion-badge">Sec-CH-UA</span>
  <span class="evasion-badge">4 Accept Sets</span>
  <span class="evasion-badge">Proxy Routing</span>
  <span class="evasion-badge">Circuit Breaker</span>
  <span class="evasion-badge">WarpSpeed CSV</span>
  <span class="evasion-badge">Browser Rendering</span>
  <span class="evasion-badge">PDF Download</span>
  <span class="evasion-badge">32 Instruments</span>
  <span class="evasion-badge">19 Tyler Counties</span>
  ECHO PRIME Technologies | echo-op.com
</p>
<div class="grid">
  <div class="card"><h3>Total Records</h3><div class="stat" id="totalRecords">—</div><div class="stat-label">Scraped across all counties</div></div>
  <div class="card"><h3>R2 Uploads</h3><div class="stat" id="r2Uploads">—</div><div class="stat-label">Files in cloud storage</div></div>
  <div class="card"><h3>Active Counties</h3><div class="stat" id="activeCounties">—</div><div class="stat-label">Permian Basin + NM</div></div>
  <div class="card"><h3>Jobs Running</h3><div class="stat" id="runningJobs">—</div><div class="stat-label" id="jobSummary">—</div></div>
  <div class="card"><h3>Tyler Built-In</h3><div class="stat" id="tylerCount">—</div><div class="stat-label">WarpSpeed counties (raw HTTP)</div></div>
</div>
<div class="tabs">
  <div class="tab active" onclick="switchTab('scrape')">Launch Scrape</div>
  <div class="tab" onclick="switchTab('warpspeed')">WarpSpeed</div>
  <div class="tab" onclick="switchTab('jobs')">Job Monitor</div>
  <div class="tab" onclick="switchTab('search')">Search Records</div>
  <div class="tab" onclick="switchTab('intelligence')">Doc Intelligence</div>
</div>
<div class="tab-content active" id="tab-scrape"><div class="card" style="border-top-left-radius:0;border-top-right-radius:0">
  <div class="form-row">
    <select id="county"><option value="">Loading...</option></select>
    <select id="instrumentType"><option value="">All Instruments</option><option value="DEED">DEED</option><option value="WARRANTY DEED">WARRANTY DEED</option><option value="MINERAL DEED">MINERAL DEED</option><option value="OIL AND GAS LEASE">OIL AND GAS LEASE</option><option value="DEED OF TRUST">DEED OF TRUST</option><option value="RELEASE">RELEASE</option><option value="ASSIGNMENT">ASSIGNMENT</option><option value="AMENDMENT">AMENDMENT</option><option value="EASEMENT">EASEMENT</option><option value="RIGHT OF WAY">RIGHT OF WAY</option><option value="LIEN">LIEN</option><option value="ABSTRACT OF JUDGMENT">ABSTRACT OF JUDGMENT</option><option value="POWER OF ATTORNEY">POWER OF ATTORNEY</option><option value="PLAT">PLAT</option><option value="AFFIDAVIT">AFFIDAVIT</option><option value="ROYALTY DEED">ROYALTY DEED</option><option value="CORRECTION DEED">CORRECTION DEED</option><option value="AFFIDAVIT OF HEIRSHIP">AFFIDAVIT OF HEIRSHIP</option><option value="UCC FILING">UCC FILING</option><option value="LIS PENDENS">LIS PENDENS</option><option value="RATIFICATION">RATIFICATION</option><option value="BILL OF SALE">BILL OF SALE</option><option value="FIELD NOTES">FIELD NOTES</option><option value="MINERAL SURVEY">MINERAL SURVEY</option><option value="PATENT">PATENT</option><option value="PROBATE">PROBATE</option><option value="FEDERAL TAX LIEN">FEDERAL TAX LIEN</option><option value="STATE TAX LIEN">STATE TAX LIEN</option><option value="MINERAL APPLICATION">MINERAL APPLICATION</option><option value="PERMIT">PERMIT</option><option value="TRANSFER OF LIEN">TRANSFER OF LIEN</option><option value="ASSUMED NAME">ASSUMED NAME</option></select>
    <button class="btn" onclick="launchScrape()">LAUNCH</button>
    <button class="btn green" onclick="launchAll()">ALL INSTRUMENTS</button>
    <button class="btn orange" onclick="launchMulti()">ALL COUNTIES</button>
    <button class="btn" onclick="launchDiscovery()" style="background:#8b5cf6">DISCOVER</button>
  </div>
  <div id="log">ShadowGlass v9.1 AAAAA\\n120+ evasion + D1 Direct Ingest + Chain-of-Title API\\n56 instrument types + Data Quality Engine + Legal Parser\\nAutonomous scrape → normalize → score → ingest → serve\\n</div>
</div></div>
<div class="tab-content" id="tab-warpspeed"><div class="card" style="border-top-left-radius:0;border-top-right-radius:0">
  <h3>⚡ WarpSpeed Mode — Raw HTTP CSV Export</h3>
  <p style="color:var(--muted);font-size:0.85rem;margin-bottom:1rem">Direct Tyler Tech scrape via 5-step JSF flow. Entire result set in ONE CSV request. 100-500x faster than browser.</p>
  <div class="form-row">
    <select id="wsCounty">${Object.keys(TYLER_COUNTIES || {}).map(c => '<option value="' + c + '">' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>').join('')}</select>
    <input type="text" id="wsStart" placeholder="Start date M/D/YYYY" value="1/1/2024">
    <input type="text" id="wsEnd" placeholder="End date M/D/YYYY" value="12/31/2024">
    <button class="btn green" onclick="launchWarpSpeed()">⚡ WARP SPEED</button>
    <button class="btn orange" onclick="launchWarpSpeedAll()">ALL 19 COUNTIES</button>
  </div>
  <div id="wsLog" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:1rem;height:150px;overflow-y:auto;font-size:0.8rem;color:var(--green);white-space:pre-wrap">Ready for WarpSpeed...\\n</div>
</div></div>
<div class="tab-content" id="tab-jobs"><div class="card" style="border-top-left-radius:0;border-top-right-radius:0">
  <div class="form-row"><button class="btn sm" onclick="loadJobs()">Refresh</button><span style="color:var(--muted);font-size:0.8rem" id="jobRefreshTime">—</span></div>
  <table><thead><tr><th>County</th><th>Instrument</th><th>Status</th><th>Progress</th><th>Records</th><th>Actions</th></tr></thead><tbody id="jobsTable"></tbody></table>
</div></div>
<div class="tab-content" id="tab-search"><div class="card" style="border-top-left-radius:0;border-top-right-radius:0">
  <div class="search-row">
    <input type="text" id="searchGrantor" placeholder="Grantor name...">
    <input type="text" id="searchGrantee" placeholder="Grantee name...">
    <input type="date" id="searchFrom"><input type="date" id="searchTo">
    <button class="btn" onclick="searchRecordsUI()">Search</button>
  </div>
  <table><thead><tr><th>ID</th><th>Type</th><th>Grantor</th><th>Grantee</th><th>Filing Date</th><th>Legal Desc</th></tr></thead><tbody id="searchResults"></tbody></table>
  <div style="margin-top:1rem;display:flex;gap:0.5rem">
    <button class="btn sm" id="prevPage" onclick="searchPage(-1)" disabled>Prev</button>
    <span style="color:var(--muted);font-size:0.8rem" id="pageInfo">—</span>
    <button class="btn sm" id="nextPage" onclick="searchPage(1)">Next</button>
  </div>
</div></div>
<div class="tab-content" id="tab-intelligence"><div class="card" style="border-top-left-radius:0;border-top-right-radius:0">
  <h3>Document Intelligence Pipeline — OCR + Entity Extraction</h3>
  <p style="color:var(--muted);font-size:0.85rem;margin-bottom:1rem">Every scraped PDF is auto-analyzed: Browser Rendering → Workers AI Vision (Llama 3.2) → Entity Parser → D1/R2 Storage</p>
  <div class="grid" style="margin-bottom:1rem">
    <div class="card" style="padding:1rem"><h3 style="font-size:0.85rem">Pipeline Total</h3><div class="stat" style="font-size:2rem" id="pipeTotal">—</div></div>
    <div class="card" style="padding:1rem"><h3 style="font-size:0.85rem">Analyzed</h3><div class="stat" style="font-size:2rem;color:var(--green)" id="pipeAnalyzed">—</div></div>
    <div class="card" style="padding:1rem"><h3 style="font-size:0.85rem">Avg Confidence</h3><div class="stat" style="font-size:2rem;color:var(--orange)" id="pipeConfidence">—</div></div>
    <div class="card" style="padding:1rem"><h3 style="font-size:0.85rem">With Entities</h3><div class="stat" style="font-size:2rem;color:#8b5cf6" id="pipeEntities">—</div></div>
  </div>
  <div class="form-row">
    <input type="text" id="intSearchGrantor" placeholder="Grantor...">
    <input type="text" id="intSearchSection" placeholder="Section/Block...">
    <input type="text" id="intSearchCounty" placeholder="County...">
    <button class="btn" onclick="searchPipeline()">Search Analyzed Docs</button>
    <button class="btn green sm" onclick="loadPipelineStats()">Refresh Stats</button>
  </div>
  <table><thead><tr><th>Document</th><th>County</th><th>Type</th><th>Confidence</th><th>Grantor</th><th>Legal Desc</th><th>Consideration</th><th>Cloud</th></tr></thead><tbody id="pipeResults"></tbody></table>
  <div class="form-row" style="margin-top:1rem">
    <button class="btn sm orange" onclick="reanalyzeFailed()">Re-analyze Failed</button>
    <button class="btn sm" onclick="reanalyzePending()">Process Pending</button>
    <span style="color:var(--muted);font-size:0.8rem" id="pipeStatus">—</span>
  </div>
</div></div>
</div>
<script>
let searchOffset=0;const LIMIT=50;
function switchTab(n){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));event.target.classList.add('active');document.getElementById('tab-'+n).classList.add('active');if(n==='jobs')loadJobs();}
function log(m){const e=document.getElementById('log');e.textContent+=new Date().toLocaleTimeString()+' '+m+'\\n';e.scrollTop=e.scrollHeight;}
function wsLog(m){const e=document.getElementById('wsLog');e.textContent+=new Date().toLocaleTimeString()+' '+m+'\\n';e.scrollTop=e.scrollHeight;}
async function loadCounties(){try{const r=await(await fetch('/counties')).json();document.getElementById('county').innerHTML=(r.data||[]).map(c=>'<option value="'+c.name+'">'+c.name+' ('+c.state+')</option>').join('');}catch(e){}}
async function loadStats(){try{const r=await(await fetch('/stats')).json();const s=r.data||{};const j=s.jobs||{};document.getElementById('totalRecords').textContent=(j.scrapedRecords||0).toLocaleString();document.getElementById('r2Uploads').textContent=(s.r2Uploads||0).toLocaleString();document.getElementById('activeCounties').textContent=s.activeCounties||0;document.getElementById('runningJobs').textContent=j.runningJobs||0;document.getElementById('jobSummary').textContent=(j.completedJobs||0)+' done / '+(j.failedJobs||0)+' failed';document.getElementById('tylerCount').textContent=s.tylerCountiesBuiltIn||0;}catch(e){}}
async function loadJobs(){try{const r=await(await fetch('/status')).json();const jobs=r.data||[];document.getElementById('jobsTable').innerHTML=jobs.map(j=>'<tr><td>'+j.county+'</td><td style="font-size:0.8rem">'+j.instrumentType+'</td><td><span class="badge '+j.status+'">'+j.status+'</span></td><td style="min-width:120px"><div class="progress-bar"><div class="progress-fill" style="width:'+j.progress+'%"></div></div><span style="font-size:0.75rem;color:var(--muted)">'+j.progress+'%</span></td><td>'+(j.scrapedRecords||0).toLocaleString()+' / '+(j.totalRecords||0).toLocaleString()+'</td><td>'+(j.status==='running'?'<button class="btn sm red" onclick="pauseJob('+j.id+')">Pause</button>':'')+(j.status==='paused'?'<button class="btn sm green" onclick="resumeJob('+j.id+')">Resume</button>':'')+'</td></tr>').join('');document.getElementById('jobRefreshTime').textContent='Updated: '+new Date().toLocaleTimeString();}catch(e){}}
async function launchScrape(){const c=document.getElementById('county').value;const i=document.getElementById('instrumentType').value;if(!c||!i){log('Select county + instrument');return;}log('Launching '+c+'/'+i+'...');try{const r=await(await fetch('/scrape',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({county:c,instrumentType:i})})).json();log(r.ok?'Queued: '+(r.data?.message||'OK'):'Error: '+r.error);}catch(e){log('Error: '+e.message);}setTimeout(loadStats,2000);}
async function launchAll(){const c=document.getElementById('county').value;if(!c){log('Select a county');return;}log('ALL instruments for '+c+'...');try{const r=await(await fetch('/scrape/all',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({county:c})})).json();log(r.ok?r.data?.message:'Error: '+r.error);}catch(e){log('Error: '+e.message);}setTimeout(loadStats,2000);}
async function launchMulti(){log('ALL COUNTIES launching...');try{const cr=await(await fetch('/counties')).json();const counties=(cr.data||[]).filter(c=>c.is_active).map(c=>c.name);const r=await(await fetch('/scrape/multi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({counties})})).json();log(r.ok?'Multi-county: '+counties.length+' counties':'Error: '+r.error);}catch(e){log('Error: '+e.message);}setTimeout(loadStats,3000);}
async function launchDiscovery(){const c=document.getElementById('county').value;if(!c){log('Select county');return;}log('Discovering '+c+'...');try{const r=await(await fetch('/discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({county:c})})).json();log(r.ok?r.data?.message:'Error: '+r.error);}catch(e){log('Error: '+e.message);}}
async function launchWarpSpeed(){const c=document.getElementById('wsCounty').value;const s=document.getElementById('wsStart').value;const e=document.getElementById('wsEnd').value;wsLog('⚡ WarpSpeed: '+c+' '+s+' → '+e);try{const r=await(await fetch('/warpspeed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({county:c,dateStart:s,dateEnd:e})})).json();wsLog(r.ok?'✅ '+r.data.records+' records, '+Math.round(r.data.elapsed/1000)+'s':'❌ '+r.error);}catch(err){wsLog('Error: '+err.message);}}
async function launchWarpSpeedAll(){wsLog('⚡ WarpSpeed ALL 19 counties...');try{const r=await(await fetch('/warpspeed/all',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dateStart:document.getElementById('wsStart').value,dateEnd:document.getElementById('wsEnd').value})})).json();wsLog(r.ok?'✅ Total: '+r.data.totalRecords+' records across '+Object.keys(r.data.counties).length+' counties':'❌ '+r.error);}catch(err){wsLog('Error: '+err.message);}}
async function pauseJob(id){await fetch('/pause/'+id,{method:'POST'});loadJobs();}
async function resumeJob(id){await fetch('/resume/'+id,{method:'POST'});loadJobs();}
async function searchRecordsUI(){searchOffset=0;await doSearch();}
async function searchPage(dir){searchOffset=Math.max(0,searchOffset+dir*LIMIT);await doSearch();}
async function doSearch(){const p=new URLSearchParams();const c=document.getElementById('county').value;const g=document.getElementById('searchGrantor').value;const e=document.getElementById('searchGrantee').value;const f=document.getElementById('searchFrom').value;const t=document.getElementById('searchTo').value;if(c)p.set('county',c);if(g)p.set('grantor',g);if(e)p.set('grantee',e);if(f)p.set('from',f);if(t)p.set('to',t);p.set('limit',LIMIT);p.set('offset',searchOffset);try{const r=await(await fetch('/search?'+p)).json();const rows=r.data||[];document.getElementById('searchResults').innerHTML=rows.map(r=>'<tr><td>'+(r.external_id||r.id)+'</td><td style="font-size:0.8rem">'+(r.instrument_type_id||'')+'</td><td>'+(r.grantor||'')+'</td><td>'+(r.grantee||'')+'</td><td>'+(r.filing_date||'')+'</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(r.legal_description||'')+'</td></tr>').join('')||'<tr><td colspan="6" style="color:var(--muted)">No results</td></tr>';document.getElementById('pageInfo').textContent='Showing '+(searchOffset+1)+'-'+(searchOffset+rows.length);document.getElementById('prevPage').disabled=searchOffset===0;document.getElementById('nextPage').disabled=rows.length<LIMIT;}catch(e){}}
async function loadPipelineStats(){try{const r=await(await fetch('/pipeline/stats')).json();const s=r.data||{};document.getElementById('pipeTotal').textContent=(s.totalDocuments||0).toLocaleString();document.getElementById('pipeAnalyzed').textContent=(s.analyzedDocuments||0).toLocaleString();document.getElementById('pipeConfidence').textContent=s.averageConfidence?s.averageConfidence.toFixed(2):'—';document.getElementById('pipeEntities').textContent=(s.withExtractedEntities||0).toLocaleString();document.getElementById('pipeStatus').textContent='Pipeline: '+JSON.stringify(s.byStatus||[]);}catch(e){document.getElementById('pipeStatus').textContent='Error: '+e.message;}}
async function searchPipeline(){const g=document.getElementById('intSearchGrantor').value;const s=document.getElementById('intSearchSection').value;const c=document.getElementById('intSearchCounty').value;const p=new URLSearchParams();if(g)p.set('grantor',g);if(s)p.set('section',s);if(c)p.set('county',c);p.set('limit','50');try{const r=await(await fetch('/pipeline/search?'+p)).json();const rows=r.data||[];document.getElementById('pipeResults').innerHTML=rows.map(d=>'<tr><td style="font-size:0.75rem">'+d.document_id+'</td><td>'+(d.county_name||'')+'</td><td style="font-size:0.8rem">'+(d.instrument_name||'')+'</td><td><span class="badge '+(d.ocr_confidence>0.6?'completed':'pending')+'">'+(d.ocr_confidence||0).toFixed(2)+'</span></td><td>'+(d.grantor_extracted||'—')+'</td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(d.section_block_survey||d.legal_description_extracted||'—')+'</td><td>'+(d.consideration_extracted?'$'+Number(d.consideration_extracted).toLocaleString():'—')+'</td><td style="font-size:0.7rem"><a href="/pipeline/doc/'+encodeURIComponent(d.document_id)+'" target="_blank" style="color:var(--accent)">ctx</a> | <a href="/pipeline/text/'+encodeURIComponent(d.document_id)+'" target="_blank" style="color:var(--green)">txt</a></td></tr>').join('')||'<tr><td colspan="8" style="color:var(--muted)">No analyzed documents found</td></tr>';}catch(e){document.getElementById('pipeResults').innerHTML='<tr><td colspan="8" style="color:var(--red)">Error: '+e.message+'</td></tr>';}}
async function reanalyzeFailed(){try{const r=await(await fetch('/pipeline/reanalyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'failed',limit:50})})).json();document.getElementById('pipeStatus').textContent=r.ok?r.data.message:'Error: '+r.error;loadPipelineStats();}catch(e){document.getElementById('pipeStatus').textContent='Error: '+e.message;}}
async function reanalyzePending(){try{const r=await(await fetch('/pipeline/reanalyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'pending',limit:50})})).json();document.getElementById('pipeStatus').textContent=r.ok?r.data.message:'Error: '+r.error;loadPipelineStats();}catch(e){document.getElementById('pipeStatus').textContent='Error: '+e.message;}}
loadCounties();loadStats();loadPipelineStats();setInterval(loadStats,15000);setInterval(loadPipelineStats,30000);
<\/script></body></html>`;

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  v9.0 AAAAA — DEED RECORDS D1 DIRECT INGEST PIPELINE                      ║
// ║  Every scraped record is IMMEDIATELY inserted into deed_records D1 table   ║
// ║  Chain-of-title orchestrator can query in real-time                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const DEED_RECORDS_SCHEMA = `
CREATE TABLE IF NOT EXISTS deed_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  county TEXT NOT NULL,
  instrument_type TEXT NOT NULL,
  instrument_number TEXT,
  doc_id TEXT,
  recorded_date TEXT,
  instrument_date TEXT,
  grantor TEXT,
  grantee TEXT,
  legal_description TEXT,
  section TEXT,
  block TEXT,
  lot TEXT,
  subdivision TEXT,
  survey TEXT,
  volume TEXT,
  page TEXT,
  book TEXT,
  consideration TEXT,
  acres TEXT,
  pdf_url TEXT,
  platform TEXT,
  scrape_source TEXT DEFAULT 'shadowglass_v9',
  data_quality_score REAL DEFAULT 0.0,
  ingested_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)`;

const DEED_RECORDS_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_dr_county ON deed_records(county)',
  'CREATE INDEX IF NOT EXISTS idx_dr_section ON deed_records(section)',
  'CREATE INDEX IF NOT EXISTS idx_dr_block ON deed_records(block)',
  'CREATE INDEX IF NOT EXISTS idx_dr_grantor ON deed_records(grantor)',
  'CREATE INDEX IF NOT EXISTS idx_dr_grantee ON deed_records(grantee)',
  'CREATE INDEX IF NOT EXISTS idx_dr_instrument_type ON deed_records(instrument_type)',
  'CREATE INDEX IF NOT EXISTS idx_dr_recorded_date ON deed_records(recorded_date)',
  'CREATE INDEX IF NOT EXISTS idx_dr_doc_id ON deed_records(doc_id)',
  'CREATE INDEX IF NOT EXISTS idx_dr_instrument_number ON deed_records(instrument_number)',
  'CREATE INDEX IF NOT EXISTS idx_dr_volume_page ON deed_records(volume, page)',
  'CREATE INDEX IF NOT EXISTS idx_dr_legal_desc ON deed_records(legal_description)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_dr_dedup ON deed_records(county, doc_id, instrument_type)',
];

const INGEST_LEDGER_SCHEMA = `
CREATE TABLE IF NOT EXISTS ingest_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  county TEXT NOT NULL,
  instrument_type TEXT NOT NULL,
  page_number INTEGER,
  records_ingested INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  data_quality_avg REAL DEFAULT 0.0,
  r2_key TEXT,
  batch_hash TEXT,
  ingested_at TEXT DEFAULT (datetime('now'))
)`;

const INGEST_STATS_SCHEMA = `
CREATE TABLE IF NOT EXISTS ingest_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  county TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  total_instruments INTEGER DEFAULT 0,
  unique_grantors INTEGER DEFAULT 0,
  unique_grantees INTEGER DEFAULT 0,
  date_range_start TEXT,
  date_range_end TEXT,
  last_ingest_at TEXT DEFAULT (datetime('now')),
  quality_score_avg REAL DEFAULT 0.0,
  completeness_pct REAL DEFAULT 0.0,
  UNIQUE(county)
)`;

const SCRAPE_WATERMARK_SCHEMA = `
CREATE TABLE IF NOT EXISTS scrape_watermarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  county TEXT NOT NULL,
  instrument_type TEXT NOT NULL,
  platform TEXT DEFAULT 'PUBLICSEARCH',
  last_page_scraped INTEGER DEFAULT 0,
  total_pages_known INTEGER DEFAULT 0,
  last_record_date TEXT,
  records_in_db INTEGER DEFAULT 0,
  new_records_last_run INTEGER DEFAULT 0,
  consecutive_zero_new INTEGER DEFAULT 0,
  last_scraped_at TEXT DEFAULT (datetime('now')),
  next_scrape_at TEXT DEFAULT (datetime('now')),
  scrape_priority INTEGER DEFAULT 5,
  UNIQUE(county, instrument_type)
)`;

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  COURT RECORDS SCHEMA — Tyler Odyssey Portal (criminal/civil/family)       ║
// ║  Stores case records, warrants, affidavits, orders from Odyssey portals    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const COURT_RECORDS_SCHEMA = `
CREATE TABLE IF NOT EXISTS court_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  county TEXT NOT NULL,
  state TEXT DEFAULT 'TX',
  case_number TEXT,
  case_type TEXT,
  case_style TEXT,
  court TEXT,
  judge TEXT,
  file_date TEXT,
  status TEXT,
  party_name TEXT,
  party_role TEXT,
  attorney TEXT,
  charges TEXT,
  offense_date TEXT,
  offense_description TEXT,
  bond_amount TEXT,
  disposition TEXT,
  disposition_date TEXT,
  next_hearing_date TEXT,
  documents_available TEXT,
  odyssey_eid TEXT,
  portal_url TEXT,
  platform TEXT DEFAULT 'ODYSSEY',
  scrape_source TEXT DEFAULT 'shadowglass_v9.1',
  scraped_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)`;

const COURT_RECORDS_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_cr_county ON court_records(county)',
  'CREATE INDEX IF NOT EXISTS idx_cr_case_number ON court_records(case_number)',
  'CREATE INDEX IF NOT EXISTS idx_cr_case_type ON court_records(case_type)',
  'CREATE INDEX IF NOT EXISTS idx_cr_party_name ON court_records(party_name)',
  'CREATE INDEX IF NOT EXISTS idx_cr_court ON court_records(court)',
  'CREATE INDEX IF NOT EXISTS idx_cr_judge ON court_records(judge)',
  'CREATE INDEX IF NOT EXISTS idx_cr_file_date ON court_records(file_date)',
  'CREATE INDEX IF NOT EXISTS idx_cr_status ON court_records(status)',
  'CREATE INDEX IF NOT EXISTS idx_cr_odyssey_eid ON court_records(odyssey_eid)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_cr_dedup ON court_records(county, case_number, party_name)',
];

const COURT_DOCUMENTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS court_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  court_record_id INTEGER,
  county TEXT NOT NULL,
  case_number TEXT,
  document_type TEXT,
  document_title TEXT,
  filed_date TEXT,
  filed_by TEXT,
  r2_key TEXT,
  r2_pdf_key TEXT,
  file_size INTEGER DEFAULT 0,
  page_count INTEGER DEFAULT 0,
  ocr_text TEXT,
  ocr_confidence REAL DEFAULT 0.0,
  portal_url TEXT,
  platform TEXT DEFAULT 'ODYSSEY',
  scraped_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (court_record_id) REFERENCES court_records(id)
)`;

const COURT_DOCUMENTS_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_cd_county ON court_documents(county)',
  'CREATE INDEX IF NOT EXISTS idx_cd_case_number ON court_documents(case_number)',
  'CREATE INDEX IF NOT EXISTS idx_cd_document_type ON court_documents(document_type)',
  'CREATE INDEX IF NOT EXISTS idx_cd_filed_date ON court_documents(filed_date)',
];

let courtSchemaInitialized = false;

async function ensureCourtRecordsSchema(env) {
  if (courtSchemaInitialized) return;
  try {
    await env.DB.prepare(COURT_RECORDS_SCHEMA).run();
    for (const idx of COURT_RECORDS_INDEXES) {
      try { await env.DB.prepare(idx).run(); } catch {}
    }
    await env.DB.prepare(COURT_DOCUMENTS_SCHEMA).run();
    for (const idx of COURT_DOCUMENTS_INDEXES) {
      try { await env.DB.prepare(idx).run(); } catch {}
    }
    courtSchemaInitialized = true;
  } catch (e) {
    console.error(`[SCHEMA] court_records init error: ${e.message}`);
  }
}

let schemaInitialized = false;

async function ensureDeedRecordsSchema(env) {
  if (schemaInitialized) return;
  try {
    await env.DB.prepare(DEED_RECORDS_SCHEMA).run();
    for (const idx of DEED_RECORDS_INDEXES) {
      try { await env.DB.prepare(idx).run(); } catch {}
    }
    await env.DB.prepare(INGEST_LEDGER_SCHEMA).run();
    await env.DB.prepare(INGEST_STATS_SCHEMA).run();
    await env.DB.prepare(SCRAPE_WATERMARK_SCHEMA).run();
    schemaInitialized = true;
  } catch (e) {
    console.error(`[SCHEMA] deed_records init error: ${e.message}`);
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  DATA QUALITY ENGINE — Score every record before D1 ingest                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function scoreDataQuality(record) {
  let score = 0.0;
  const checks = [
    [!!record.grantor && record.grantor.length > 2, 0.15, 'has_grantor'],
    [!!record.grantee && record.grantee.length > 2, 0.15, 'has_grantee'],
    [!!record.recordedDate || !!record.filingDate, 0.10, 'has_date'],
    [!!record.legalDescription && record.legalDescription.length > 5, 0.15, 'has_legal'],
    [!!record.bookPage || (!!record.volume && !!record.page), 0.10, 'has_vol_page'],
    [!!record.id && record.id !== 'undefined', 0.10, 'has_doc_id'],
    [!!record.instrumentType, 0.05, 'has_type'],
    // Bonus: legal description quality
    [record.legalDescription && /SEC|SECTION|BLK|BLOCK|LOT|SURVEY|SUBDIV/i.test(record.legalDescription), 0.10, 'legal_has_parcel_info'],
    // Bonus: grantor/grantee look like real names (not "AND X MORE")
    [record.grantor && !/^AND \d+ MORE/i.test(record.grantor), 0.05, 'grantor_real_name'],
    [record.grantee && !/^AND \d+ MORE/i.test(record.grantee), 0.05, 'grantee_real_name'],
  ];
  for (const [pass, weight] of checks) {
    if (pass) score += weight;
  }
  return Math.round(score * 100) / 100;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  LEGAL DESCRIPTION PARSER — Extract section/block/lot/survey/subdivision   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function parseLegalDescription(legalDesc) {
  if (!legalDesc) return {};
  const text = legalDesc.toUpperCase();
  const parsed = {};

  // Section patterns
  const secMatch = text.match(/(?:SEC(?:TION)?\.?\s*)(\d+)/);
  if (secMatch) parsed.section = secMatch[1];

  // Block patterns
  const blkMatch = text.match(/(?:BL(?:OC)?K\.?\s*)(\d+|[A-Z]-?\d+)/);
  if (blkMatch) parsed.block = blkMatch[1];

  // Lot patterns
  const lotMatch = text.match(/(?:LOT\.?\s*)(\d+)/);
  if (lotMatch) parsed.lot = lotMatch[1];

  // Survey patterns
  const srvMatch = text.match(/(?:H\s*&\s*GN|H&GN|PSL|T&P|GC&SF|TC)\s*(?:RR|RY)?\s*(?:CO)?\s*(?:SURVEY)?/i);
  if (srvMatch) parsed.survey = srvMatch[0].trim();

  // Subdivision patterns
  const subMatch = text.match(/(?:SUBDIV(?:ISION)?|SUBD?\.?)\s*[-:]?\s*(?:NAME:\s*)?([A-Z][A-Z &'.]+?)(?:\s*(?:LOT|BLK|BLOCK|SEC|,|$))/);
  if (subMatch) parsed.subdivision = subMatch[1].trim();
  if (!parsed.subdivision) {
    const toyahMatch = text.match(/TOYAH\s+VALLEY\s+GRAPE\s*(?:&|AND)\s*ALFALFA/i);
    if (toyahMatch) parsed.subdivision = 'TOYAH VALLEY GRAPE & ALFALFA';
  }

  // Volume/Page from bookPage field
  // Handled separately in normalizeRecord

  // Acres
  const acreMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:AC(?:RES)?|ACRE)/i);
  if (acreMatch) parsed.acres = acreMatch[1];

  return parsed;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  RECORD NORMALIZER — Standardize raw scrape data for D1 ingest             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function normalizeInstrumentType(raw) {
  if (!raw) return 'UNKNOWN';
  const upper = raw.toUpperCase().trim();
  // Map portal-specific names to standard types
  const MAP = {
    'WD': 'WARRANTY DEED', 'W/D': 'WARRANTY DEED', 'WARRANTY': 'WARRANTY DEED',
    'QCD': 'QUIT CLAIM DEED', 'Q/C': 'QUIT CLAIM DEED', 'QUITCLAIM': 'QUIT CLAIM DEED',
    'MD': 'MINERAL DEED', 'M/D': 'MINERAL DEED',
    'OGL': 'OIL AND GAS LEASE', 'O&G LEASE': 'OIL AND GAS LEASE', 'OIL & GAS LEASE': 'OIL AND GAS LEASE',
    'DOT': 'DEED OF TRUST', 'D/T': 'DEED OF TRUST',
    'RD': 'ROYALTY DEED', 'R/D': 'ROYALTY DEED',
    'AOH': 'AFFIDAVIT OF HEIRSHIP', 'AFF OF HEIRSHIP': 'AFFIDAVIT OF HEIRSHIP',
    'AFF': 'AFFIDAVIT', 'AFFID': 'AFFIDAVIT',
    'CORR': 'CORRECTION DEED', 'CORRECTION': 'CORRECTION DEED', 'CORR DEED': 'CORRECTION DEED',
    'REL': 'RELEASE', 'R/L': 'RELEASE',
    'ASGN': 'ASSIGNMENT', 'ASN': 'ASSIGNMENT', 'ASSIGN': 'ASSIGNMENT',
    'MEM': 'MEMORANDUM', 'MEMO': 'MEMORANDUM', 'MEMORANDUM OF LEASE': 'MEMORANDUM',
    'POA': 'POWER OF ATTORNEY', 'P/A': 'POWER OF ATTORNEY',
    'ROW': 'RIGHT OF WAY', 'R/W': 'RIGHT OF WAY',
    'UCC': 'UCC FILING', 'UCC-1': 'UCC FILING',
    'FTL': 'FEDERAL TAX LIEN', 'STL': 'STATE TAX LIEN',
    'RAT': 'RATIFICATION', 'RATIF': 'RATIFICATION',
    'CONV': 'CONVEYANCE',
    'SL': 'SURFACE LEASE',
    'PA': 'POOLING AGREEMENT', 'POOL': 'POOLING AGREEMENT',
    'UO': 'UNITIZATION ORDER', 'UNIT ORDER': 'UNITIZATION ORDER',
    'WILL': 'WILL', 'PROB': 'PROBATE',
    'BOS': 'BILL OF SALE', 'B/S': 'BILL OF SALE',
    'ESMT': 'EASEMENT',
    'LP': 'LIS PENDENS',
    'ABJ': 'ABSTRACT OF JUDGMENT', 'AOJ': 'ABSTRACT OF JUDGMENT',
    'AMEND': 'AMENDMENT', 'AMD': 'AMENDMENT',
    'PAT': 'PATENT',
    'TL': 'TRANSFER OF LIEN',
    'AN': 'ASSUMED NAME', 'DBA': 'ASSUMED NAME',
    // v9.1 — 18 new instrument type abbreviations
    'GD': 'GIFT DEED', 'GIFT': 'GIFT DEED',
    'EXD': 'EXECUTORS DEED', "EXECUTOR'S DEED": 'EXECUTORS DEED', 'EXEC DEED': 'EXECUTORS DEED',
    'TRD': 'TRUSTEES DEED', "TRUSTEE'S DEED": 'TRUSTEES DEED', 'TRUST DEED': 'TRUSTEES DEED',
    'GUARD DEED': 'GUARDIANS DEED', "GUARDIAN'S DEED": 'GUARDIANS DEED',
    'TD': 'TAX DEED', 'TAX SALE DEED': 'TAX DEED', 'TAX SALE': 'TAX DEED',
    'TODD': 'TRANSFER ON DEATH DEED', 'TOD': 'TRANSFER ON DEATH DEED', 'TRANSFER ON DEATH': 'TRANSFER ON DEATH DEED',
    'PART': 'PARTITION DEED', 'PARTITION': 'PARTITION DEED',
    'LED': 'LIFE ESTATE DEED', 'LIFE EST': 'LIFE ESTATE DEED', 'LIFE ESTATE': 'LIFE ESTATE DEED',
    'CFD': 'CONTRACT FOR DEED', 'VENDEE LIEN': 'CONTRACT FOR DEED',
    'DIL': 'DEED IN LIEU', 'DEED IN LIEU OF FORECLOSURE': 'DEED IN LIEU',
    'TOPL': 'TOP LEASE',
    'LR': 'LEASE RELEASE', 'LEASE REL': 'LEASE RELEASE', 'LEASE SURRENDER': 'LEASE RELEASE',
    'CE': 'CONSERVATION EASEMENT',
    'COD': 'CODICIL',
    'DOH': 'DETERMINATION OF HEIRSHIP', 'DET HEIRSHIP': 'DETERMINATION OF HEIRSHIP',
    'SEA': 'SMALL ESTATE AFFIDAVIT', 'SMALL ESTATE': 'SMALL ESTATE AFFIDAVIT',
    'AOI': 'AFFIDAVIT OF IDENTITY', 'AFF OF IDENTITY': 'AFFIDAVIT OF IDENTITY', 'IDENTITY AFF': 'AFFIDAVIT OF IDENTITY',
    'DO': 'DIVISION ORDER', 'DIV ORDER': 'DIVISION ORDER', 'DIV ORD': 'DIVISION ORDER',
  };
  return MAP[upper] || upper;
}

async function normalizeRecord(env, record, county, instrumentType, platform) {
  const legal = parseLegalDescription(record.legalDescription || '');
  const bookPage = record.bookPage || '';
  let volume = '', page = '';
  if (bookPage) {
    const vpMatch = bookPage.match(/(?:VOL(?:UME)?\.?\s*)(\d+)\s*(?:PG|PAGE|P)\.?\s*(\d+)/i);
    if (vpMatch) { volume = vpMatch[1]; page = vpMatch[2]; }
    else {
      const slashMatch = bookPage.match(/(\d+)\s*[\/\-]\s*(\d+)/);
      if (slashMatch) { volume = slashMatch[1]; page = slashMatch[2]; }
    }
  }
  const recDate = record.recordedDate || record.filingDate || '';

  // LLM enhancement: only when regex fails to find section/block AND we have a real legal desc
  let llmLegal = null;
  if (!legal.section && !legal.block && record.legalDescription
      && record.legalDescription.length > 15 && record.legalDescription !== 'SEE INSTRUMENT') {
    try { llmLegal = await llmParseLegal(env, record.legalDescription, county); } catch {}
  }

  return {
    county: (county || '').toUpperCase(),
    instrument_type: normalizeInstrumentType(record.instrumentType || instrumentType),
    instrument_number: record.id || record.docNumber || '',
    doc_id: record.id || record.docNumber || `${county}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    recorded_date: recDate,
    instrument_date: record.instrumentDate || recDate,
    grantor: (record.grantor || '').substring(0, 2000),
    grantee: (record.grantee || '').substring(0, 2000),
    legal_description: (record.legalDescription || '').substring(0, 4000),
    section: legal.section || (llmLegal?.section || ''),
    block: legal.block || (llmLegal?.block || ''),
    lot: legal.lot || (llmLegal?.lot || ''),
    subdivision: legal.subdivision || (llmLegal?.subdivision || ''),
    survey: legal.survey || (llmLegal?.survey || ''),
    volume: volume,
    page: page,
    book: bookPage ? bookPage.substring(0, 200) : '',
    consideration: (record.consideration || '').substring(0, 200),
    acres: legal.acres || (llmLegal?.acres || ''),
    pdf_url: (record.pdfUrl || '').substring(0, 500),
    platform: platform || 'PUBLICSEARCH',
  };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  D1 DIRECT INGEST — Called after every scrape batch                        ║
// ║  Deduplicates via UNIQUE(county, doc_id, instrument_type)                  ║
// ║  Scores data quality, parses legal descriptions, normalizes types          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const D1_INGEST_SQL = `INSERT OR IGNORE INTO deed_records (
  county, instrument_type, instrument_number, doc_id, recorded_date, instrument_date,
  grantor, grantee, legal_description, section, block, lot, subdivision, survey,
  volume, page, book, consideration, record_hash, platform, data_quality_score
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

async function ingestBatchToD1(env, scrapeResult) {
  await ensureDeedRecordsSchema(env);
  const county = scrapeResult.county;
  const instrumentType = scrapeResult.instrumentType;
  const platform = scrapeResult.platform || 'PUBLICSEARCH';
  const records = scrapeResult.records || [];
  if (records.length === 0) return { ingested: 0, skipped: 0, failed: 0 };

  let ingested = 0, skipped = 0, failed = 0;
  let qualitySum = 0;

  // Process in batches of 25 (D1 batch limit considerations)
  const BATCH_SIZE = 25;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const stmts = [];
    for (const raw of chunk) {
      try {
        const rec = await normalizeRecord(env, raw, county, instrumentType, platform);
        const quality = scoreDataQuality(raw);
        qualitySum += quality;
        // Generate record_hash for dedup
        const hashStr = `${rec.county}|${rec.doc_id}|${rec.instrument_type}`;
        const hashBytes = new TextEncoder().encode(hashStr);
        const hashBuf = await crypto.subtle.digest('SHA-256', hashBytes);
        const recordHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
        stmts.push(
          env.DB.prepare(D1_INGEST_SQL).bind(
            rec.county, rec.instrument_type, rec.instrument_number, rec.doc_id,
            rec.recorded_date, rec.instrument_date, rec.grantor, rec.grantee,
            rec.legal_description, rec.section, rec.block, rec.lot,
            rec.subdivision, rec.survey, rec.volume, rec.page, rec.book,
            rec.consideration, recordHash, rec.platform, quality
          )
        );
      } catch (e) {
        failed++;
      }
    }
    if (stmts.length > 0) {
      try {
        const results = await env.DB.batch(stmts);
        for (const r of results) {
          if (r.meta?.changes > 0) ingested++;
          else skipped++; // duplicate
        }
      } catch (e) {
        // Fallback: insert one-by-one on batch failure
        for (const stmt of stmts) {
          try { const r = await stmt.run(); if (r.meta?.changes > 0) ingested++; else skipped++; }
          catch { failed++; }
        }
      }
    }
  }

  // Log to ingest ledger
  const avgQuality = records.length > 0 ? Math.round((qualitySum / records.length) * 100) / 100 : 0;
  try {
    await env.DB.prepare(
      `INSERT INTO ingest_ledger (county, instrument_type, page_number, records_ingested, records_skipped, records_failed, data_quality_avg, r2_key, ingested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(county, instrumentType, scrapeResult.page || 0, ingested, skipped, failed, avgQuality,
      `ENCORE/${county}/${instrumentType.replace(/ /g, '_')}/page_${String(scrapeResult.page || 0).padStart(6, '0')}.json`
    ).run();
  } catch {}

  if (ingested > 0) {
    console.log(`[D1-INGEST] ${county}/${instrumentType} pg${scrapeResult.page || 0}: ${ingested} new, ${skipped} dup, ${failed} fail, quality=${avgQuality}`);
  }

  // Update scrape watermark — tracks progress for intelligent re-scraping
  try {
    const page = scrapeResult.page || 0;
    const existing = await env.DB.prepare(
      'SELECT id, last_page_scraped, consecutive_zero_new FROM scrape_watermarks WHERE county = ? AND instrument_type = ?'
    ).bind(county, instrumentType).first();

    if (existing) {
      const newConsecZero = ingested === 0 ? (existing.consecutive_zero_new || 0) + 1 : 0;
      // Adaptive priority: more new records = higher priority = scrape sooner
      // Consecutive zero-new runs = lower priority = scrape less often
      const priority = ingested > 10 ? 10 : ingested > 0 ? 7 : Math.max(1, 5 - newConsecZero);
      // Next scrape: high-activity combos every 4h, stale ones every 48h
      const hoursUntilNext = ingested > 10 ? 4 : ingested > 0 ? 12 : Math.min(48, 24 + newConsecZero * 8);
      await env.DB.prepare(`UPDATE scrape_watermarks SET
        last_page_scraped = MAX(last_page_scraped, ?),
        records_in_db = (SELECT COUNT(*) FROM deed_records WHERE county = ? AND instrument_type = ?),
        new_records_last_run = ?,
        consecutive_zero_new = ?,
        last_scraped_at = datetime('now'),
        next_scrape_at = datetime('now', '+' || ? || ' hours'),
        scrape_priority = ?
        WHERE county = ? AND instrument_type = ?`
      ).bind(page, county, instrumentType, ingested, newConsecZero, hoursUntilNext, priority, county, instrumentType).run();
    } else {
      await env.DB.prepare(`INSERT OR IGNORE INTO scrape_watermarks
        (county, instrument_type, platform, last_page_scraped, records_in_db, new_records_last_run, consecutive_zero_new, scrape_priority)
        VALUES (?, ?, ?, ?, ?, ?, 0, 7)`
      ).bind(county, instrumentType, platform, page, ingested, ingested).run();
    }
  } catch (e) {
    console.error(`[WATERMARK] Update error: ${e.message}`);
  }

  return { ingested, skipped, failed, avgQuality };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  COUNTY INGEST STATS — Aggregate stats per county for monitoring           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function updateCountyIngestStats(env, county) {
  try {
    const stats = await env.DB.prepare(`
      SELECT COUNT(*) as total,
        COUNT(DISTINCT instrument_type) as types,
        COUNT(DISTINCT grantor) as grantors,
        COUNT(DISTINCT grantee) as grantees,
        MIN(recorded_date) as earliest,
        MAX(recorded_date) as latest,
        AVG(data_quality_score) as avg_quality
      FROM deed_records WHERE county = ?
    `).bind(county).first();
    if (!stats || stats.total === 0) return;

    // Completeness: % of instrument types present vs expected
    const completeness = Math.round((stats.types / INSTRUMENT_TYPES.length) * 100 * 100) / 100;

    await env.DB.prepare(`
      INSERT INTO ingest_stats (county, total_records, total_instruments, unique_grantors, unique_grantees,
        date_range_start, date_range_end, quality_score_avg, completeness_pct, last_ingest_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(county) DO UPDATE SET
        total_records=?, total_instruments=?, unique_grantors=?, unique_grantees=?,
        date_range_start=?, date_range_end=?, quality_score_avg=?, completeness_pct=?,
        last_ingest_at=datetime('now')
    `).bind(
      county, stats.total, stats.types, stats.grantors, stats.grantees,
      stats.earliest, stats.latest, Math.round(stats.avg_quality * 100) / 100, completeness,
      stats.total, stats.types, stats.grantors, stats.grantees,
      stats.earliest, stats.latest, Math.round(stats.avg_quality * 100) / 100, completeness
    ).run();
  } catch (e) {
    console.error(`[INGEST-STATS] ${county} update failed: ${e.message}`);
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  CHAIN-OF-TITLE QUERY ENGINE — Direct D1 queries for the orchestrator      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function chainOfTitleQuery(env, params) {
  await ensureDeedRecordsSchema(env);
  const { county, section, block, lot, subdivision, grantor, grantee,
          docNumber, volume, page, dateFrom, dateTo, limit = 200 } = params;

  let sql = 'SELECT * FROM deed_records WHERE 1=1';
  const binds = [];

  if (county) { sql += ' AND county = ?'; binds.push(county.toUpperCase()); }
  if (section) { sql += ' AND (section LIKE ? OR legal_description LIKE ?)'; binds.push(`%${section}%`, `%${section}%`); }
  if (block) { sql += ' AND (block LIKE ? OR legal_description LIKE ?)'; binds.push(`%${block}%`, `%BLOCK ${block}%`); }
  if (lot) { sql += ' AND (lot LIKE ? OR legal_description LIKE ?)'; binds.push(`%${lot}%`, `%LOT ${lot}%`); }
  if (subdivision) { sql += ' AND (subdivision LIKE ? OR legal_description LIKE ?)'; binds.push(`%${subdivision}%`, `%${subdivision}%`); }
  if (grantor) { sql += ' AND grantor LIKE ?'; binds.push(`%${grantor.toUpperCase()}%`); }
  if (grantee) { sql += ' AND grantee LIKE ?'; binds.push(`%${grantee.toUpperCase()}%`); }
  if (docNumber) { sql += ' AND (instrument_number = ? OR doc_id = ?)'; binds.push(docNumber, docNumber); }
  if (volume && page) { sql += ' AND volume = ? AND page = ?'; binds.push(volume, page); }
  if (dateFrom) { sql += ' AND recorded_date >= ?'; binds.push(dateFrom); }
  if (dateTo) { sql += ' AND recorded_date <= ?'; binds.push(dateTo); }

  sql += ' ORDER BY recorded_date ASC LIMIT ?';
  binds.push(Math.min(limit, 500));

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return {
    ok: true,
    data: {
      records: results || [],
      count: results?.length || 0,
      query: { county, section, block, lot, subdivision, grantor, grantee, docNumber },
    },
    timestamp: now(),
  };
}

async function chainOfTitleStats(env, county) {
  await ensureDeedRecordsSchema(env);
  const countyUpper = (county || '').toUpperCase();

  const total = await env.DB.prepare('SELECT COUNT(*) as cnt FROM deed_records WHERE county = ?').bind(countyUpper).first();
  const byType = await env.DB.prepare(
    'SELECT instrument_type, COUNT(*) as cnt FROM deed_records WHERE county = ? GROUP BY instrument_type ORDER BY cnt DESC'
  ).bind(countyUpper).all();
  const dateRange = await env.DB.prepare(
    'SELECT MIN(recorded_date) as earliest, MAX(recorded_date) as latest FROM deed_records WHERE county = ?'
  ).bind(countyUpper).first();
  const quality = await env.DB.prepare(
    'SELECT AVG(data_quality_score) as avg_score, MIN(data_quality_score) as min_score, MAX(data_quality_score) as max_score FROM deed_records WHERE county = ?'
  ).bind(countyUpper).first();
  const sections = await env.DB.prepare(
    "SELECT section, COUNT(*) as cnt FROM deed_records WHERE county = ? AND section != '' GROUP BY section ORDER BY cnt DESC LIMIT 50"
  ).bind(countyUpper).all();

  // Missing instrument types
  const presentTypes = new Set((byType?.results || []).map(r => r.instrument_type));
  const missingTypes = INSTRUMENT_TYPES.filter(t => !presentTypes.has(t));

  return {
    ok: true,
    data: {
      county: countyUpper,
      totalRecords: total?.cnt || 0,
      byInstrumentType: byType?.results || [],
      presentTypes: presentTypes.size,
      totalExpectedTypes: INSTRUMENT_TYPES.length,
      missingTypes,
      completeness: Math.round((presentTypes.size / INSTRUMENT_TYPES.length) * 100 * 10) / 10,
      dateRange: { earliest: dateRange?.earliest, latest: dateRange?.latest },
      quality: {
        avg: Math.round((quality?.avg_score || 0) * 100) / 100,
        min: Math.round((quality?.min_score || 0) * 100) / 100,
        max: Math.round((quality?.max_score || 0) * 100) / 100,
      },
      topSections: sections?.results || [],
    },
    timestamp: now(),
  };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  BULK BACKFILL — Ingest existing R2 JSON pages into deed_records           ║
// ║  For counties already scraped but not yet in deed_records D1               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function backfillFromR2(env, county, instrumentType, maxPages = 100) {
  await ensureDeedRecordsSchema(env);
  const countyUp = county.toUpperCase();
  const typeSlug = (instrumentType || '').replace(/ /g, '_');
  // Check both PublicSearch and Tyler Tech R2 paths
  const prefixes = [
    `ENCORE/${countyUp}/${typeSlug}/`,
    `ENCORE/TYLER/${countyUp}/${typeSlug}/`,
  ];
  let allObjects = [];
  for (const prefix of prefixes) {
    const listed = await env.R2_RECORDS.list({ prefix, limit: maxPages });
    if (listed?.objects?.length) allObjects.push(...listed.objects);
  }
  if (allObjects.length === 0) return { ok: true, data: { message: 'No R2 objects found', prefixes, county } };

  let totalIngested = 0, totalSkipped = 0, totalFailed = 0, pagesProcessed = 0;
  for (const obj of allObjects) {
    try {
      const data = await env.R2_RECORDS.get(obj.key);
      if (!data) continue;

      let scrapeResult;
      if (obj.key.endsWith('.csv')) {
        // Tyler CSV file — parse into records
        const csvText = await data.text();
        const records = parseTylerCSV(csvText, countyUp, instrumentType);
        if (records.length === 0) continue;
        scrapeResult = { county: countyUp, instrumentType, records, page: pagesProcessed, platform: 'TYLER_TECH' };
      } else {
        // JSON file — use directly
        const json = await data.json();
        if (!json?.records?.length) continue;
        scrapeResult = json;
      }

      const result = await ingestBatchToD1(env, scrapeResult);
      totalIngested += result.ingested;
      totalSkipped += result.skipped;
      totalFailed += result.failed;
      pagesProcessed++;
    } catch (e) {
      console.error(`[BACKFILL] Error processing ${obj.key}: ${e.message}`);
      totalFailed++;
    }
  }

  // Update county stats
  await updateCountyIngestStats(env, county.toUpperCase());

  return {
    ok: true,
    data: {
      county: county.toUpperCase(),
      instrumentType: instrumentType || 'ALL',
      pagesProcessed,
      totalIngested,
      totalSkipped,
      totalFailed,
      r2Prefix: `ENCORE/${county.toUpperCase()}/`,
    },
    timestamp: now(),
  };
}

async function backfillAllFromR2(env, county, maxPagesPerType = 50) {
  await ensureDeedRecordsSchema(env);
  const countyUpper = county.toUpperCase();
  let grandTotal = { ingested: 0, skipped: 0, failed: 0, types: 0 };

  for (const instType of INSTRUMENT_TYPES) {
    const result = await backfillFromR2(env, countyUpper, instType, maxPagesPerType);
    if (result.ok && result.data.pagesProcessed > 0) {
      grandTotal.ingested += result.data.totalIngested;
      grandTotal.skipped += result.data.totalSkipped;
      grandTotal.failed += result.data.totalFailed;
      grandTotal.types++;
    }
  }

  await updateCountyIngestStats(env, countyUpper);

  return {
    ok: true,
    data: {
      county: countyUpper,
      instrumentTypesProcessed: grandTotal.types,
      totalIngested: grandTotal.ingested,
      totalSkipped: grandTotal.skipped,
      totalFailed: grandTotal.failed,
    },
    timestamp: now(),
  };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TELEMETRY — Real-time metrics for monitoring and alerting                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function getTelemetry(env) {
  await ensureDeedRecordsSchema(env);
  const deedCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM deed_records').first();
  const countyBreakdown = await env.DB.prepare(
    'SELECT county, COUNT(*) as cnt FROM deed_records GROUP BY county ORDER BY cnt DESC LIMIT 30'
  ).all();
  const recentIngests = await env.DB.prepare(
    'SELECT county, instrument_type, records_ingested, records_skipped, data_quality_avg, ingested_at FROM ingest_ledger ORDER BY ingested_at DESC LIMIT 20'
  ).all();
  const ingestStats = await env.DB.prepare(
    'SELECT * FROM ingest_stats ORDER BY total_records DESC'
  ).all();
  const qualityDist = await env.DB.prepare(`
    SELECT
      CASE
        WHEN data_quality_score >= 0.9 THEN 'A (90-100%)'
        WHEN data_quality_score >= 0.7 THEN 'B (70-89%)'
        WHEN data_quality_score >= 0.5 THEN 'C (50-69%)'
        WHEN data_quality_score >= 0.3 THEN 'D (30-49%)'
        ELSE 'F (0-29%)'
      END as grade,
      COUNT(*) as cnt
    FROM deed_records GROUP BY grade ORDER BY grade
  `).all();

  return {
    ok: true,
    data: {
      version: VERSION,
      codename: CODENAME,
      totalDeedRecords: deedCount?.cnt || 0,
      byCounty: countyBreakdown?.results || [],
      recentIngests: recentIngests?.results || [],
      countyStats: ingestStats?.results || [],
      qualityDistribution: qualityDist?.results || [],
      instrumentTypesSupported: INSTRUMENT_TYPES.length,
      instrumentTypes: INSTRUMENT_TYPES,
    },
    timestamp: now(),
  };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TYLER ODYSSEY COURT RECORD SCRAPER v1.0                                   ║
// ║  Browser-based: Odyssey portals require full JS rendering (no raw HTTP)    ║
// ║  Uses @cloudflare/puppeteer for headless Chrome on edge                    ║
// ║  Supports: Smart Search, Case Detail, Document Download                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

async function odysseyBrowserSearch(env, portalUrl, searchTerm, searchType = 'smart') {
  await ensureCourtRecordsSchema(env);
  const results = [];
  let browser, page;

  try {
    browser = await puppeteer.launch(env.BROWSER);
    page = await browser.newPage();

    // Set realistic viewport + UA
    const identity = generateIdentity();
    await page.setUserAgent(identity.ua);
    await page.setViewport({ width: 1920, height: 1080 });

    // Step 1: Navigate to portal root to establish session
    console.log(`[ODYSSEY] Navigating to portal root: ${portalUrl}/`);
    await page.goto(`${portalUrl}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Step 2: Force-click timeoutContinueBtn and any other dialogs (even if hidden)
    try {
      await page.evaluate(() => {
        // Force-click timeout continue button
        const btn = document.getElementById('timeoutContinueBtn');
        if (btn) btn.click();
        // Click any modal backdrop to dismiss it
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
        // Click any visible Continue/Accept/OK buttons
        document.querySelectorAll('button, input[type="button"], a.btn').forEach(el => {
          const text = el.textContent?.toLowerCase() || el.value?.toLowerCase() || '';
          if (['continue', 'accept', 'ok', 'dismiss', 'agree'].some(k => text.includes(k))) {
            try { el.click(); } catch {}
          }
        });
      });
      console.log(`[ODYSSEY] Forced dismiss of any dialogs`);
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log(`[ODYSSEY] Dialog dismiss error (non-fatal): ${e.message}`);
    }

    // Step 3: Check if portal requires login
    const currentUrl1 = page.url();
    const hasLogin = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const loginLink = links.find(l => l.href?.includes('/Account/Login') || l.textContent?.includes('Sign In'));
      const dashLinks = links.filter(l => l.href?.includes('/Home/Dashboard'));
      const searchLinks = links.filter(l => l.href?.includes('/Search'));
      return { hasLoginLink: !!loginLink, dashboardLinks: dashLinks.map(l => l.href), searchLinks: searchLinks.map(l => l.href) };
    });
    console.log(`[ODYSSEY] Portal state: ${JSON.stringify(hasLogin)}`);

    // Step 4: Navigate to Smart Search dashboard
    const dashboardUrl = `${portalUrl}/Home/Dashboard/29`;
    console.log(`[ODYSSEY] Navigating to Smart Search: ${dashboardUrl}`);
    const navResponse = await page.goto(dashboardUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if we got redirected back (login required)
    const currentUrl2 = page.url();
    console.log(`[ODYSSEY] After nav: ${currentUrl2} (status: ${navResponse?.status()})`);

    // If redirected to login or back to root — try authentication
    if (currentUrl2.includes('/Account/Login') || (currentUrl2.endsWith('/Portal/') && !currentUrl2.includes('Dashboard'))) {
      console.log(`[ODYSSEY] Portal requires auth. Attempting login...`);

      const loginSuccess = await odysseyLogin(page, portalUrl, env);
      if (loginSuccess) {
        console.log(`[ODYSSEY] Login succeeded, retrying Smart Search navigation`);
        await page.goto(dashboardUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(3000);
        // Dismiss any post-login dialogs
        try { await page.evaluate(() => { const b = document.getElementById('timeoutContinueBtn'); if (b) b.click(); }); } catch {}
      } else {
        console.log(`[ODYSSEY] Login failed or no credentials. Portal requires auth.`);
        // Check if there's ANY anonymous search available
        await page.goto(`${portalUrl}/`, { waitUntil: 'networkidle0', timeout: 20000 });
        await page.waitForTimeout(2000);
        try { await page.evaluate(() => { const b = document.getElementById('timeoutContinueBtn'); if (b) b.click(); }); } catch {}
      }
    }

    // Step 5: Final dialog dismissal
    try {
      await page.evaluate(() => {
        const btn = document.getElementById('timeoutContinueBtn');
        if (btn) btn.click();
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
      });
      await page.waitForTimeout(1000);
    } catch {}

    const pageTitle = await page.title();
    const currentUrl = page.url();
    console.log(`[ODYSSEY] Final page: title="${pageTitle}", URL="${currentUrl}"`);

    // Try to find the search input — Odyssey uses multiple selectors
    const searchSelectors = [
      '#SearchCriteriaContainer input[type="text"]',
      '#SmartSearchString',
      'input.smart-search-input',
      'input[name="SearchCriteria"]',
      '#portalSearch input',
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]',
    ];

    let searchInput = null;
    for (const sel of searchSelectors) {
      try {
        searchInput = await page.waitForSelector(sel, { timeout: 5000 });
        if (searchInput) {
          console.log(`[ODYSSEY] Found search input: ${sel}`);
          break;
        }
      } catch {}
    }

    if (!searchInput) {
      // Dump the page content for debugging
      const html = await page.content();
      console.log(`[ODYSSEY] No search input found. Page HTML length: ${html.length}`);
      const inputsFound = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, button, a.btn')).map(el => ({
          tag: el.tagName, type: el.type || '', id: el.id, name: el.name || '',
          className: (el.className || '').toString().substring(0, 100),
          placeholder: el.placeholder || '', text: el.textContent?.trim()?.substring(0, 60) || '',
          href: el.href || '',
        }));
      });
      const allLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).slice(0, 20).map(a => ({
          text: a.textContent?.trim()?.substring(0, 60),
          href: a.href,
        }));
      });
      console.log(`[ODYSSEY] Elements found: ${JSON.stringify(inputsFound).substring(0, 500)}`);

      // Try screenshot for debugging (save to R2)
      let screenshotKey = null;
      try {
        const screenshot = await page.screenshot({ fullPage: true });
        screenshotKey = `ODYSSEY/debug/search_fail_${Date.now()}.png`;
        await env.R2_RECORDS.put(screenshotKey, screenshot, { customMetadata: { type: 'debug_screenshot', searchTerm, timestamp: now() } });
        console.log(`[ODYSSEY] Debug screenshot saved to R2: ${screenshotKey}`);
      } catch (e) { console.error(`[ODYSSEY] Screenshot error: ${e.message}`); }

      // Get page HTML snippet
      const htmlSnippet = html.substring(0, 2000);

      return { ok: false, error: 'Search input not found', pageTitle, currentUrl: page.url(), inputs: inputsFound, links: allLinks, htmlLength: html.length, htmlSnippet, screenshotKey };
    }

    // Type search term
    await searchInput.click({ clickCount: 3 }); // Select all
    await searchInput.type(searchTerm, { delay: 50 }); // Type with human-like delay

    // Find and click submit button
    const submitSelectors = [
      '#btnSSSubmit',
      'button[type="submit"]',
      'input[type="submit"]',
      'button.smart-search-submit',
      'a.ss-search-submit',
    ];

    let submitted = false;
    for (const sel of submitSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          submitted = true;
          console.log(`[ODYSSEY] Clicked submit: ${sel}`);
          break;
        }
      } catch {}
    }

    if (!submitted) {
      // Try pressing Enter
      await page.keyboard.press('Enter');
      console.log(`[ODYSSEY] Pressed Enter to submit`);
    }

    // Wait for results to load
    await page.waitForTimeout(3000);

    // Try to find results container
    const resultSelectors = [
      '#SmartSearchResults',
      '.search-results',
      'table.case-results',
      '#CaseSearchResults',
      '.k-grid-content',
    ];

    let hasResults = false;
    for (const sel of resultSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 10000 });
        hasResults = true;
        console.log(`[ODYSSEY] Results container found: ${sel}`);
        break;
      } catch {}
    }

    // Extract case results
    const caseResults = await page.evaluate(() => {
      const cases = [];

      // Method 1: Case links (most common Odyssey format)
      const caseLinks = document.querySelectorAll('a.caseLink, a[data-url*="CaseDetail"]');
      for (const link of caseLinks) {
        const row = link.closest('tr') || link.closest('li') || link.parentElement;
        const cells = row ? row.querySelectorAll('td, span.field-value') : [];
        const cellTexts = Array.from(cells).map(c => c.textContent.trim());
        cases.push({
          text: link.textContent.trim(),
          url: link.getAttribute('data-url') || link.getAttribute('href') || '',
          caseNumber: cellTexts[0] || link.textContent.trim(),
          style: cellTexts[1] || '',
          fileDate: cellTexts[2] || '',
          status: cellTexts[3] || '',
          type: cellTexts[4] || '',
          court: cellTexts[5] || '',
        });
      }

      // Method 2: Kendo grid rows (some Odyssey versions)
      if (cases.length === 0) {
        const gridRows = document.querySelectorAll('.k-grid-content tr, .k-grid tr[data-uid]');
        for (const row of gridRows) {
          const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim());
          const link = row.querySelector('a');
          if (cells.length >= 3) {
            cases.push({
              text: cells.join(' | '),
              url: link?.getAttribute('href') || link?.getAttribute('data-url') || '',
              caseNumber: cells[0],
              style: cells[1] || '',
              fileDate: cells[2] || '',
              status: cells[3] || '',
              type: cells[4] || '',
              court: cells[5] || '',
            });
          }
        }
      }

      // Method 3: Any table with case-like data
      if (cases.length === 0) {
        const allRows = document.querySelectorAll('table tr');
        for (const row of allRows) {
          const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim());
          if (cells.length >= 3 && /\d{2}[-/]\d/.test(cells[0])) {
            cases.push({
              text: cells.join(' | '),
              url: '',
              caseNumber: cells[0],
              style: cells[1],
              fileDate: cells[2],
              status: cells[3] || '',
              type: cells[4] || '',
              court: cells[5] || '',
            });
          }
        }
      }

      return cases;
    });

    // Get page HTML for analysis if no results
    const finalHtml = await page.content();

    results.push(...caseResults);
    console.log(`[ODYSSEY] Found ${results.length} case results for "${searchTerm}"`);

    return {
      ok: true,
      searchTerm,
      resultCount: results.length,
      cases: results,
      hasResults,
      pageTitle: await page.title(),
      htmlLength: finalHtml.length,
    };

  } catch (e) {
    console.error(`[ODYSSEY] Browser search error: ${e.message}`);
    return { ok: false, error: e.message, searchTerm };
  } finally {
    try { if (page) await page.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
  }
}

async function odysseyCaseDetail(env, portalUrl, caseUrl) {
  let browser, page;

  try {
    browser = await puppeteer.launch(env.BROWSER);
    page = await browser.newPage();

    const identity = generateIdentity();
    await page.setUserAgent(identity.ua);
    await page.setViewport({ width: 1920, height: 1080 });

    const fullUrl = caseUrl.startsWith('http') ? caseUrl : `${portalUrl}${caseUrl}`;
    console.log(`[ODYSSEY] Navigating to case detail: ${fullUrl}`);
    await page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for case detail to load
    await page.waitForTimeout(2000);

    // Extract case details
    const caseDetail = await page.evaluate(() => {
      const detail = {};

      // Case header info
      const caseNum = document.querySelector('.case-number, #CaseNumber, h2.panel-title');
      if (caseNum) detail.caseNumber = caseNum.textContent.trim();

      const caseStyle = document.querySelector('.case-style, .case-title');
      if (caseStyle) detail.caseStyle = caseStyle.textContent.trim();

      // All labeled fields
      const fields = document.querySelectorAll('.case-detail-field, .roa-field, .row-field, dt, .field-label');
      for (const field of fields) {
        const label = field.textContent.trim().replace(/:$/, '');
        const value = field.nextElementSibling?.textContent?.trim() || '';
        if (label && value) detail[label.replace(/\s+/g, '_').toLowerCase()] = value;
      }

      // Parties section
      const parties = [];
      const partyRows = document.querySelectorAll('.party-row, .party-info, tr[data-party]');
      for (const row of partyRows) {
        const cells = Array.from(row.querySelectorAll('td, span')).map(c => c.textContent.trim());
        if (cells.length >= 2) parties.push({ name: cells[0], role: cells[1], attorney: cells[2] || '' });
      }
      detail.parties = parties;

      // Events/Docket section
      const events = [];
      const eventRows = document.querySelectorAll('.event-row, .docket-entry, .roa-row, tr.event');
      for (const row of eventRows) {
        const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim());
        if (cells.length >= 2) events.push({ date: cells[0], description: cells[1], type: cells[2] || '', judge: cells[3] || '' });
      }
      detail.events = events;

      // Documents section
      const documents = [];
      const docLinks = document.querySelectorAll('a[href*="document"], a[href*="Document"], .document-link, a.doc-link');
      for (const link of docLinks) {
        documents.push({
          title: link.textContent.trim(),
          url: link.getAttribute('href') || '',
          type: link.closest('tr')?.querySelector('td:nth-child(2)')?.textContent?.trim() || '',
        });
      }
      detail.documents = documents;

      // Charges section (criminal)
      const charges = [];
      const chargeRows = document.querySelectorAll('.charge-row, tr.charge');
      for (const row of chargeRows) {
        const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim());
        if (cells.length >= 2) charges.push({ count: cells[0], description: cells[1], disposition: cells[2] || '', date: cells[3] || '' });
      }
      detail.charges = charges;

      return detail;
    });

    // Get full HTML for archival
    const html = await page.content();

    return { ok: true, caseDetail, htmlLength: html.length, url: fullUrl };

  } catch (e) {
    console.error(`[ODYSSEY] Case detail error: ${e.message}`);
    return { ok: false, error: e.message };
  } finally {
    try { if (page) await page.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
  }
}

async function odysseyIngestCase(env, county, caseData) {
  await ensureCourtRecordsSchema(env);

  try {
    const stmt = env.DB.prepare(`
      INSERT INTO court_records (county, case_number, case_type, case_style, court, judge, file_date, status, party_name, party_role, charges, odyssey_eid, portal_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(county, case_number, party_name) DO UPDATE SET
        case_style=excluded.case_style, court=excluded.court, judge=excluded.judge, status=excluded.status,
        charges=excluded.charges, updated_at=datetime('now')
    `);

    await stmt.bind(
      county.toUpperCase(),
      caseData.caseNumber || '',
      caseData.type || '',
      caseData.style || caseData.caseStyle || '',
      caseData.court || '',
      caseData.judge || '',
      caseData.fileDate || caseData.file_date || '',
      caseData.status || '',
      caseData.partyName || (caseData.parties?.[0]?.name) || '',
      caseData.partyRole || (caseData.parties?.[0]?.role) || '',
      caseData.charges ? JSON.stringify(caseData.charges) : '',
      caseData.odysseyEid || caseData.url || '',
      caseData.portalUrl || '',
    ).run();

    return { ok: true };
  } catch (e) {
    console.error(`[ODYSSEY-INGEST] ${e.message}`);
    return { ok: false, error: e.message };
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  WORKER EXPORT — HTTP HANDLER + QUEUE CONSUMER + CRON                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export default {
  // ═══ HTTP Handler ═══════════════════════════════════════════
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      // Dashboard
      if (method === 'GET' && (path === '/' || path === '/dashboard')) return new Response(DASHBOARD_HTML, { headers: { 'Content-Type': 'text/html', ...cors } });

      // Health
      if (method === 'GET' && path === '/health') return json({ ok: true, data: { version: VERSION, codename: CODENAME, status: 'operational', evasionEngine: 'v8.1 OMEGA ULTIMATE', platforms: ['PUBLICSEARCH', 'TYLER_TECH', 'TEXASFILE', 'ODYSSEY'], tylerCounties: Object.keys(TYLER_COUNTIES).length, odysseyPortals: Object.keys(ODYSSEY_PORTALS).length, bindings: { d1: 'shadowglass-scraper', r2: 'echo-prime-knowledge', kv: 'DEDUP_KV', queue: 'shadowglass-v8-queue', browser: true, ai: true }, pipeline: { model: 'llama-3.2-11b-vision-instruct', stages: ['pdf_download', 'pipeline_register', 'ocr_queue', 'browser_render', 'ai_vision', 'entity_extract', 'd1_store', 'r2_archive'] }, features: ['30 UAs', 'Sec-CH-UA matching', '4 Accept sets', 'proxy routing', 'circuit breakers', 'WarpSpeed CSV', 'exponential backoff', 'Browser Rendering', 'PDF download to R2', 'Workers AI OCR', 'entity extraction', 'document intelligence pipeline', '32 instrument types', 'Tyler Odyssey court records', 'warrant/affidavit search'] }, timestamp: now() }, 200, cors);

      // Stats
      if (method === 'GET' && path === '/stats') return json(await getStats(env), 200, cors);

      // Counties
      if (method === 'GET' && path === '/counties') {
        const { results } = await env.DB.prepare('SELECT id, name, state, base_url, platform, is_active FROM counties ORDER BY platform, name').all();
        return json({ ok: true, data: results, timestamp: now() }, 200, cors);
      }

      // D1 deed_records counts by county
      if (method === 'GET' && path === '/d1/counts') {
        const { results } = await env.DB.prepare('SELECT county, COUNT(*) as count FROM deed_records GROUP BY county ORDER BY count DESC').all();
        const total = results.reduce((s, r) => s + r.count, 0);
        return json({ ok: true, data: results, total, timestamp: now() }, 200, cors);
      }

      // D1 deed_records total
      if (method === 'GET' && path === '/d1/total') {
        const row = await env.DB.prepare('SELECT COUNT(*) as total FROM deed_records').first();
        return json({ ok: true, total: row?.total || 0, timestamp: now() }, 200, cors);
      }

      // Search records
      if (method === 'GET' && path === '/search') {
        return json(await searchRecords(env, {
          county: url.searchParams.get('county') || undefined,
          instrumentType: url.searchParams.get('type') || undefined,
          grantor: url.searchParams.get('grantor') || undefined,
          grantee: url.searchParams.get('grantee') || undefined,
          dateFrom: url.searchParams.get('from') || undefined,
          dateTo: url.searchParams.get('to') || undefined,
          limit: parseInt(url.searchParams.get('limit') || '50'),
          offset: parseInt(url.searchParams.get('offset') || '0'),
        }), 200, cors);
      }

      // R2 record download
      if (method === 'GET' && path.startsWith('/record/')) {
        const key = decodeURIComponent(path.slice(8));
        const obj = await env.R2_RECORDS.get(key);
        if (!obj) return json({ ok: false, error: 'Not found' }, 404, cors);
        return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/json', ...cors } });
      }

      // Job statuses
      if (method === 'GET' && path === '/status') return json(await getAllJobStatuses(env), 200, cors);
      if (method === 'GET' && path.startsWith('/status/')) return json(await getCountyJobStatuses(env, decodeURIComponent(path.split('/status/')[1])), 200, cors);

      // Scrape endpoints
      if (method === 'POST' && path === '/scrape') { const body = await request.json(); return json(await submitScrapeJob(env, body.county, body.instrumentType, body.startPage ?? 0), 200, cors); }
      if (method === 'POST' && path === '/scrape/all') { const body = await request.json(); return json(await submitAllInstruments(env, body.county), 200, cors); }
      if (method === 'POST' && path === '/scrape/multi') { const body = await request.json(); return json(await submitMultiCounty(env, body.counties), 200, cors); }
      if (method === 'POST' && path === '/discover') { const body = await request.json(); return json(await submitDiscovery(env, body.county), 200, cors); }

      // ═══ TexasFile direct scrape — Browser Rendering for TexasFile counties ═══
      if (method === 'POST' && path === '/scrape/texasfile') {
        if (!env.BROWSER) return json({ ok: false, error: 'BROWSER binding required for TexasFile' }, 500, cors);
        const body = await request.json();
        const countyName = (body.county || 'MARTIN').toUpperCase();
        const county = await env.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?) AND platform = 'TEXASFILE'").bind(countyName).first();
        if (!county) return json({ ok: false, error: `TexasFile county "${countyName}" not found or not active` }, 404, cors);
        const rawBook = (body.book || 'OR').toUpperCase();
        const book = tfBookToFormValue(rawBook) || rawBook; // normalize: OPR→OR, OPR1→OR, DR1→DR
        const volStart = body.volumeStart || body.volStart || 1;
        const volEnd = body.volumeEnd || body.volEnd || volStart;
        // Get or create a dummy instrument type for tracking
        let inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(`TF_${book}`).first();
        if (!inst) {
          await env.DB.prepare("INSERT OR IGNORE INTO instrument_types (name, code) VALUES (?, ?)").bind(`TF_${book}`, `TF_${book}`).run();
          inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(`TF_${book}`).first();
        }
        if (body.queue) {
          // Queue for async processing
          const CHUNK = 10;
          let queued = 0;
          for (let vs = volStart; vs <= volEnd; vs += CHUNK) {
            const ve = Math.min(vs + CHUNK - 1, volEnd);
            await env.SCRAPE_QUEUE.send({
              type: 'scrape_batch', county: countyName, countyId: county.id,
              baseUrl: county.base_url, instrumentType: `${book}_VOL_${vs}_${ve}`,
              instrumentTypeId: inst?.id || 0, platform: 'TEXASFILE',
              book, volumeStart: vs, volumeEnd: ve, startPage: 0, endPage: 0,
            });
            queued++;
          }
          return json({ ok: true, data: { message: `Queued ${queued} TexasFile volume-range jobs`, county: countyName, book, volStart, volEnd, queued }, timestamp: now() }, 200, cors);
        }
        // Direct/sync scrape (limited volumes)
        const msg = { county: countyName, countyId: county.id, baseUrl: county.base_url,
          instrumentType: `${book}_VOL_${volStart}_${volEnd}`, platform: 'TEXASFILE',
          book, volumeStart: volStart, volumeEnd: Math.min(volEnd, volStart + 4) }; // Max 5 vols sync
        const results = await scrapeTexasFileBrowser(env, msg);
        const totalRecords = results.reduce((s, r) => s + r.records.length, 0);
        return json({ ok: true, data: { message: `TexasFile direct: ${totalRecords} records from ${results.length} batches`,
          county: countyName, book, volStart, volEnd: msg.volumeEnd, totalRecords,
          sampleRecord: results[0]?.records[0] || null }, timestamp: now() }, 200, cors);
      }

      // ═══ TexasFile login page probe — see what fetch() gets vs browser ═══
      if (method === 'POST' && path === '/scrape/texasfile/login-probe') {
        const email = env.TEXASFILE_EMAIL || 'NOT_SET';
        const password = env.TEXASFILE_PASSWORD ? '***SET***' : 'NOT_SET';
        try {
          // First try with redirect follow to get the actual login page
          const resp = await fetch('https://www.texasfile.com/login/', {
            headers: { 'User-Agent': TF_UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
            redirect: 'follow',
          });
          const html = await resp.text();
          const setCookie = resp.headers.get('set-cookie') || '';
          const csrfInHtml = html.match(/csrfmiddlewaretoken/i);
          const csrfValue = html.match(/name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/)?.[1]
                         || html.match(/value=["']([^"']+)["']\s+name=["']csrfmiddlewaretoken["']/)?.[1] || null;
          const csrfCookie = setCookie.match(/csrftoken=([^;]+)/)?.[1] || null;
          const title = html.match(/<title[^>]*>([^<]+)<\/title>/)?.[1] || '';
          const hasLoginForm = !!html.match(/input.*password/i);
          const hasRecaptcha = html.includes('recaptcha') || html.includes('g-recaptcha');
          const bodySnippet = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 1000);
          return json({ ok: true, data: {
            status: resp.status, url: resp.url, title, htmlLength: html.length,
            setCookie: setCookie.substring(0, 200), csrfCookie, csrfValue,
            csrfInHtml: !!csrfInHtml, hasLoginForm, hasRecaptcha,
            email: email.substring(0, 8) + '...', password,
            bodySnippet,
          }, timestamp: now() }, 200, cors);
        } catch (e) {
          return json({ ok: false, error: e.message }, 500, cors);
        }
      }

      // ═══ TexasFile search probe — see what authenticated search returns ═══
      if (method === 'POST' && path === '/scrape/texasfile/search-probe') {
        const body = await request.json();
        const countyName = (body.county || 'MARTIN').toUpperCase();
        const county = await env.DB.prepare("SELECT id, base_url FROM counties WHERE UPPER(name) = UPPER(?) AND platform = 'TEXASFILE'").bind(countyName).first();
        if (!county) return json({ ok: false, error: `County ${countyName} not found` }, 404, cors);
        const book = (body.book || 'DR').toUpperCase();
        const vol = body.volume || 1;

        const session = await texasFileFetchLogin(env);
        if (!session) return json({ ok: false, error: 'Login failed' }, 401, cors);

        const searchUrl = county.base_url;
        const cookieStr = `csrftoken=${session.csrfCookie}; sessionid=${session.sessionId}`;

        // GET search page first
        const getResp = await fetch(searchUrl, {
          headers: { 'Cookie': cookieStr, 'User-Agent': TF_UA, 'Accept': 'text/html' },
        });
        const getHtml = await getResp.text();
        const getUrl = getResp.url;
        const getCsrf = getHtml.match(/name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/)?.[1]
                      || getHtml.match(/value=["']([^"']+)["']\s+name=["']csrfmiddlewaretoken["']/)?.[1] || null;

        // Check if search page is accessible
        const getServerProps = getHtml.match(/Server\.props\s*=\s*(\{[\s\S]{0,2000})/)?.[1] || '';
        const getAuth = getHtml.includes('is_authenticated') || !getHtml.includes('/register/');

        // POST search
        const formCsrf = getCsrf || session.csrfToken;
        const resp = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieStr, 'Referer': searchUrl,
            'Origin': 'https://www.texasfile.com', 'User-Agent': TF_UA,
            'X-CSRFToken': formCsrf,
          },
          body: new URLSearchParams({
            csrfmiddlewaretoken: formCsrf,
            'bvp-0-book': book, 'bvp-0-volume': String(vol), 'bvp-0-page': '', 'OPR_VP': 'Search',
          }).toString(),
          redirect: 'follow',
        });

        const postHtml = await resp.text();
        const postUrl = resp.url;
        const postStatus = resp.status;

        // Extract key data from response
        const propsMatch = postHtml.match(/Server\.props\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
        const serverProps = propsMatch ? propsMatch[1].substring(0, 3000) : null;
        const bokehMatch = postHtml.match(/Bokeh\.embed\.embed_items\(/) ? true : false;
        const tableCount = (postHtml.match(/<table/gi) || []).length;
        const formFields = [...postHtml.matchAll(/name=["']([^"']+)["']/gi)].map(m => m[1]).filter((v,i,a) => a.indexOf(v) === i).slice(0, 30);
        const bodyText = postHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const totalMatch = bodyText.match(/(\d[\d,]*)\s*(?:results?|records?|documents?|total)/i);
        const authRedirect = postUrl.includes('/login') || postUrl.includes('/register');

        return json({ ok: true, data: {
          getPage: { url: getUrl, htmlLen: getHtml.length, csrfInForm: !!getCsrf, authenticated: getAuth, serverPropsSnippet: getServerProps.substring(0, 500) },
          postSearch: { url: postUrl, status: postStatus, htmlLen: postHtml.length, authRedirect,
            serverProps: serverProps ? serverProps.substring(0, 2000) : null,
            hasBokeh: bokehMatch, tableCount, totalFromText: totalMatch ? totalMatch[0] : null,
            formFields, bodySnippet: bodyText.substring(0, 1500) },
        }, timestamp: now() }, 200, cors);
      }

      // ═══ TexasFile HTTP-only test — no browser, pure fetch login+scrape ═══
      if (method === 'POST' && path === '/scrape/texasfile/http') {
        const body = await request.json();
        const countyName = (body.county || 'MARTIN').toUpperCase();
        const county = await env.DB.prepare("SELECT id, base_url FROM counties WHERE UPPER(name) = UPPER(?) AND platform = 'TEXASFILE'").bind(countyName).first();
        if (!county) return json({ ok: false, error: `County ${countyName} not found or not TEXASFILE` }, 404, cors);
        const book = (body.book || 'DR').toUpperCase();
        const volStart = body.volumeStart || 1;
        const volEnd = body.volumeEnd || Math.min(volStart + 2, 500);

        // Step 1: Test login
        const session = await texasFileFetchLogin(env);
        if (!session) return json({ ok: false, error: 'TexasFile HTTP login failed — check TEXASFILE_EMAIL and TEXASFILE_PASSWORD secrets', hasEmail: !!env.TEXASFILE_EMAIL, hasPassword: !!env.TEXASFILE_PASSWORD }, 401, cors);

        // Step 2: Scrape
        const results = await scrapeTexasFileHTTP(env, {
          county: countyName, book, volumeStart: volStart, volumeEnd: volEnd,
          baseUrl: county.base_url, countyId: county.id,
        });
        const totalRecords = results.reduce((s, r) => s + r.records.length, 0);

        // Step 3: Ingest to D1
        let ingested = 0;
        for (const batch of results) {
          for (const rec of batch.records) {
            try {
              await env.DB.prepare(`INSERT OR IGNORE INTO records (county, instrument_type, doc_id, instrument_number, recorded_date, grantor, grantee, legal_description, book, volume, page, consideration, download_link, platform, data_quality_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TEXASFILE', 0.8, datetime('now'))`).bind(
                countyName, rec.instrumentType, rec.id || rec.docId || `TF-${Date.now()}-${ingested}`,
                rec.instrumentNumber || '', rec.recordedDate || '', rec.grantor || '', rec.grantee || '',
                rec.legalDescription || '', book, String(batch.volume || ''), rec.bookPage?.split('/')[2] || '',
                rec.consideration || '', rec.downloadLink || ''
              ).run();
              ingested++;
            } catch {}
          }
        }

        return json({ ok: true, data: {
          login: 'SUCCESS', county: countyName, book, volStart, volEnd,
          totalRecords, ingested, batches: results.length,
          sampleRecord: results[0]?.records[0] || null,
        }, timestamp: now() }, 200, cors);
      }

      // ═══ TexasFile debug probe — see what the browser actually sees ═══
      if (method === 'POST' && path === '/scrape/texasfile/debug') {
        if (!env.BROWSER) return json({ ok: false, error: 'BROWSER binding required' }, 500, cors);
        const body = await request.json();
        const mode = body.mode || 'search'; // 'search' or 'register'
        const countyName = (body.county || 'MARTIN').toUpperCase();
        const county = await env.DB.prepare("SELECT id, base_url FROM counties WHERE UPPER(name) = UPPER(?) AND platform = 'TEXASFILE'").bind(countyName).first();
        if (!county) return json({ ok: false, error: `TexasFile county "${countyName}" not found` }, 404, cors);
        const browser = await launchBrowserWithRetry(env);
        const page = await browser.newPage();
        try {
          await applyBrowserEvasion(page);
          if (mode === 'register') {
            // Debug the register page
            await page.goto('https://www.texasfile.com/register/', { waitUntil: 'networkidle0', timeout: 60000 });
            await humanDelay(1500, 2500);
            const regInfo = await page.evaluate(() => ({
              url: window.location.href,
              title: document.title,
              formCount: document.querySelectorAll('form').length,
              inputNames: Array.from(document.querySelectorAll('input')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder })),
              selectNames: Array.from(document.querySelectorAll('select')).map(s => ({ name: s.name, options: Array.from(s.options).map(o => o.text) })),
              buttonTexts: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
              hasRecaptcha: !!(document.querySelector('.g-recaptcha, #recaptcha, [data-sitekey], iframe[src*="recaptcha"]')),
              hasTurnstile: !!(document.querySelector('.cf-turnstile, [data-sitekey]')),
              hasHcaptcha: !!(document.querySelector('.h-captcha')),
              iframeCount: document.querySelectorAll('iframe').length,
              iframeSrcs: Array.from(document.querySelectorAll('iframe')).map(f => f.src || f.getAttribute('src') || 'none'),
              bodySnippet: (document.body?.innerText || '').substring(0, 3000),
            }));
            return json({ ok: true, data: { register: regInfo }, timestamp: now() }, 200, cors);
          }
          // Search mode (default)
          await page.goto(county.base_url, { waitUntil: 'networkidle0', timeout: 60000 });
          await humanDelay(1500, 2500);
          const preSearch = await page.evaluate(() => ({
            url: window.location.href, title: document.title,
            hasServerProps: !!(window.Server?.props), anonSearch: window.Server?.props?.search?.allow_anon_search,
            countyName: window.Server?.props?.county?.name, booksCount: window.Server?.props?.bookCoverageDetails?.length,
            formAction: document.querySelector('form')?.action || 'none',
            bvpBtn: !!document.querySelector('#BVPSearch, button[name="OPR_VP"]'),
            csrfToken: (document.querySelector('input[name="csrfmiddlewaretoken"]')?.value || '').substring(0, 20),
          }));
          await page.evaluate(() => {
            const sel = document.querySelector('#BookInput, select[name="bvp-0-book"]');
            if (sel) { sel.value = 'DR'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
          });
          await humanDelay(300, 500);
          await page.evaluate(() => {
            const inp = document.querySelector('#VolumeInput, input[name="bvp-0-volume"]');
            if (inp) { inp.value = '100'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
          });
          await humanDelay(300, 500);
          await page.evaluate(() => {
            const btn = document.querySelector('#BVPSearch, button[name="OPR_VP"]');
            if (btn) btn.click();
          });
          await humanDelay(2000, 3000);
          try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }); } catch {}
          const postSearch = await page.evaluate(() => ({
            url: window.location.href, title: document.title,
            resultsType: typeof window.Server?.props?.results,
            bodySnippet: (document.body?.innerText || '').substring(0, 2000),
            hasRecaptcha: !!(document.querySelector('.g-recaptcha, #recaptcha, [data-sitekey], iframe[src*="recaptcha"]')),
            hasBokeh: !!(window.Bokeh), tableRowCount: document.querySelectorAll('table tbody tr').length,
          }));
          return json({ ok: true, data: { preSearch, postSearch }, timestamp: now() }, 200, cors);
        } finally { await browser.close(); }
      }

      // ═══ Deep Scrape — Force date-range partitioning to bypass Kofile ceiling ═══
      if (method === 'POST' && path === '/scrape/deep') {
        const body = await request.json();
        const countyName = (body.county || '').toUpperCase();
        const county = await env.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(countyName).first();
        if (!county) return json({ ok: false, error: `County "${countyName}" not found` }, 404, cors);
        const platform = county.platform || 'PUBLICSEARCH';
        const instrumentTypes = body.instrumentType ? [body.instrumentType.toUpperCase()] : INSTRUMENT_TYPES;
        let queued = 0;
        for (const instType of instrumentTypes) {
          const inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instType).first();
          if (!inst) continue;
          // Force date-range partitioning regardless of total count
          for (const partition of DATE_PARTITIONS) {
            const partDateRange = `${partition.from},${partition.to}`;
            await env.SCRAPE_QUEUE.send({
              type: 'discovery',
              county: countyName,
              countyId: county.id,
              baseUrl: county.base_url,
              instrumentType: instType,
              instrumentTypeId: inst.id,
              startPage: 0,
              endPage: 0,
              platform,
              dateRange: partDateRange,
              dateLabel: partition.label,
              forcePartition: true,
            });
            queued++;
          }
          await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, started_at, updated_at) VALUES (?, ?, 'running', datetime('now'), datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET status='running', started_at=datetime('now'), updated_at=datetime('now')`).bind(county.id, inst.id).run();
        }
        return json({ ok: true, data: { message: `Deep scrape queued: ${instrumentTypes.length} types x ${DATE_PARTITIONS.length} date ranges = ${queued} discovery jobs for ${countyName} [${platform}]`, county: countyName, instrumentTypes: instrumentTypes.length, partitions: DATE_PARTITIONS.length, totalJobs: queued }, timestamp: now() }, 200, cors);
      }

      if (method === 'POST' && path.startsWith('/pause/')) return json(await pauseJob(env, parseInt(path.split('/pause/')[1], 10)), 200, cors);
      if (method === 'POST' && path.startsWith('/resume/')) return json(await resumeJob(env, parseInt(path.split('/resume/')[1], 10)), 200, cors);

      // ═══ NEW: WarpSpeed endpoints ═══════════════════════════
      if (method === 'POST' && path === '/warpspeed') {
        const body = await request.json();
        const result = await warpSpeedScrape(body.county, body.dateStart, body.dateEnd, env);
        return json({ ok: result.ok, data: result, timestamp: now() }, result.ok ? 200 : 500, cors);
      }

      if (method === 'POST' && path === '/warpspeed/all') {
        const body = await request.json();
        const counties = Object.keys(TYLER_COUNTIES);
        const result = await warpSpeedMulti(counties, body.dateStart || '1/1/2024', body.dateEnd || '12/31/2024', env);
        return json({ ok: true, data: result, timestamp: now() }, 200, cors);
      }

      // ═══ NEW: Circuit breaker status ════════════════════════
      if (method === 'GET' && path === '/circuits') {
        const circuits = {};
        for (const [name, cb] of circuitBreakers) circuits[name] = { state: cb.state, failures: cb.failures, lastFailure: cb.lastFailure ? new Date(cb.lastFailure).toISOString() : null };
        return json({ ok: true, data: circuits, timestamp: now() }, 200, cors);
      }

      // ═══ NEW: Tyler Tech test with v8 evasion ══════════════
      if (method === 'GET' && path === '/test/tyler') {
        const county = url.searchParams.get('county') || 'ECTOR';
        const itype = url.searchParams.get('type') || '';
        // Always prefer D1 base_url (TYLER_COUNTIES constant has stale subdomains)
        let baseUrl;
        const row = await env.DB.prepare("SELECT base_url FROM counties WHERE UPPER(name) = UPPER(?) AND platform = 'TYLER_TECH'").bind(county.toUpperCase()).first();
        if (row) {
          baseUrl = row.base_url;
        } else {
          const key = county.toLowerCase().replace(/\s+/g, '');
          const tylerInfo = TYLER_COUNTIES[key];
          if (tylerInfo) baseUrl = `https://${tylerInfo.subdomain}tx-web.tylerhost.net`;
          else return json({ ok: false, error: `Tyler Tech county "${county}" not found`, timestamp: now() }, 404, cors);
        }
        const result = await testTylerConnection(baseUrl, itype, env);
        return json({ ok: result.ok, data: result, timestamp: now() }, result.ok ? 200 : 500, cors);
      }

      // ═══ Direct scrape (from v5) ═══════════════════════════
      if (method === 'POST' && path === '/scrape/direct') {
        const body = await request.json();
        const county = await env.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(body.county.toUpperCase()).first();
        if (!county) return json({ ok: false, error: `County not found: ${body.county}` }, 404, cors);
        const instType = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(body.instrumentType.toUpperCase()).first();
        if (!instType) return json({ ok: false, error: `Instrument not found: ${body.instrumentType}` }, 404, cors);
        const platform = county.platform || 'PUBLICSEARCH';
        // TexasFile uses book/volume, not instrument type pages — redirect to proper handler
        if (platform === 'TEXASFILE') {
          const rawBook2 = (body.book || 'OR').toUpperCase();
          const book = tfBookToFormValue(rawBook2) || rawBook2; // normalize: OPR→OR, OPR1→OR
          const volStart = body.volumeStart || 1;
          const volEnd = body.volumeEnd || Math.min(volStart + 4, 500);
          const tfMsg = { county: body.county.toUpperCase(), countyId: county.id, baseUrl: county.base_url,
            instrumentType: `${book}_VOL_${volStart}_${volEnd}`, platform: 'TEXASFILE',
            book, volumeStart: volStart, volumeEnd: volEnd };
          const results = await scrapeTexasFileBrowser(env, tfMsg);
          const totalRecords = results.reduce((s, r) => s + r.records.length, 0);
          let ingested = 0, skipped = 0;
          if (totalRecords > 0) {
            for (const pageResult of results) {
              try { const ir = await ingestBatchToD1(env, pageResult); ingested += ir.ingested; skipped += ir.skipped; } catch (e) { console.error(`[DIRECT-INGEST-TF] ${e.message}`); }
            }
          }
          return json({ ok: true, data: { message: `Direct TexasFile: ${totalRecords} records from Book ${book} Vols ${volStart}-${volEnd}, ingested=${ingested} skipped=${skipped}`, platform, book, volStart, volEnd, totalRecords, ingested, skipped, sampleRecord: results[0]?.records[0] || null }, timestamp: now() }, 200, cors);
        }
        const msg = { type: 'scrape_batch', county: body.county.toUpperCase(), countyId: county.id, baseUrl: county.base_url, instrumentType: body.instrumentType.toUpperCase(), instrumentTypeId: instType.id, startPage: 0, endPage: (body.pages || 5) - 1, platform };
        const results = await scrapeBatch(env, msg);
        const totalRecords = results.reduce((s, r) => s + r.records.length, 0);
        // D1 direct ingest for direct scrapes too
        let ingested = 0, skipped = 0;
        if (totalRecords > 0) {
          for (const pageResult of results) {
            try {
              const ir = await ingestBatchToD1(env, pageResult);
              ingested += ir.ingested;
              skipped += ir.skipped;
            } catch (e) { console.error(`[DIRECT-INGEST] ${e.message}`); }
          }
        }
        return json({ ok: true, data: { message: `Direct: ${totalRecords} records from ${results.length} pages [${platform}], ingested=${ingested} skipped=${skipped}`, platform, pagesScraped: results.length, totalRecords, ingested, skipped, sampleRecord: results[0]?.records[0] || null }, timestamp: now() }, 200, cors);
      }

      // ═══ NEW: Tyler Tech counties list ═════════════════════
      if (method === 'GET' && path === '/tyler/counties') {
        return json({ ok: true, data: Object.entries(TYLER_COUNTIES).map(([key, val]) => ({ key, subdomain: val.subdomain, docsearch: val.docsearch, baseUrl: `https://${val.subdomain}tx-web.tylerhost.net` })), timestamp: now() }, 200, cors);
      }

      // ═══ v8.1: Platform scrape — launch all counties of one platform ══
      if (method === 'POST' && path === '/scrape/platform') {
        const body = await request.json();
        const platform = (body.platform || '').toUpperCase();
        if (!['PUBLICSEARCH', 'TYLER_TECH', 'TEXASFILE'].includes(platform)) return json({ ok: false, error: 'Invalid platform' }, 400, cors);
        const { results: pCounties } = await env.DB.prepare("SELECT id, name, base_url, platform FROM counties WHERE platform = ? AND is_active = 1").bind(platform).all();
        if (!pCounties?.length) return json({ ok: false, error: `No active ${platform} counties` }, 404, cors);
        let totalQueued = 0;
        for (const county of pCounties) {
          for (const instTypeName of INSTRUMENT_TYPES) {
            const inst = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instTypeName).first();
            if (!inst) continue;
            await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, started_at, updated_at) VALUES (?, ?, 'running', datetime('now'), datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET status='running', started_at=datetime('now'), updated_at=datetime('now')`).bind(county.id, inst.id).run();
            await env.SCRAPE_QUEUE.send({ type: 'discovery', county: county.name, countyId: county.id, baseUrl: county.base_url, instrumentType: instTypeName, instrumentTypeId: inst.id, startPage: 0, endPage: 0, platform });
            totalQueued++;
          }
        }
        return json({ ok: true, data: { message: `${totalQueued} jobs queued for ${pCounties.length} ${platform} counties`, counties: pCounties.length, instrumentTypes: INSTRUMENT_TYPES.length }, timestamp: now() }, 200, cors);
      }

      // ═══ v8.1: Stale job detector — find and reset stuck jobs ══════
      if (method === 'POST' && path === '/jobs/fix-stale') {
        const { results: stale } = await env.DB.prepare("SELECT j.id, c.name as county, i.name as itype FROM scrape_jobs j JOIN counties c ON j.county_id=c.id JOIN instrument_types i ON j.instrument_type_id=i.id WHERE j.status='running' AND j.updated_at < datetime('now', '-2 hours')").all();
        if (!stale?.length) return json({ ok: true, data: { fixed: 0, message: 'No stale jobs' }, timestamp: now() }, 200, cors);
        await env.DB.prepare("UPDATE scrape_jobs SET status='failed', error_message='Stale — auto-reset by v8.1', updated_at=datetime('now') WHERE status='running' AND updated_at < datetime('now', '-2 hours')").run();
        return json({ ok: true, data: { fixed: stale.length, staleJobs: stale.map(s => `${s.county}/${s.itype}`) }, timestamp: now() }, 200, cors);
      }

      // ═══ v8.1: PDF stats ═══════════════════════════════════════════
      if (method === 'GET' && path === '/stats/pdfs') {
        const pdfCount = await env.DB.prepare("SELECT COUNT(*) as cnt FROM r2_uploads WHERE content_type='application/pdf'").first();
        const pdfSize = await env.DB.prepare("SELECT COALESCE(SUM(file_size),0) as total FROM r2_uploads WHERE content_type='application/pdf'").first();
        const byCounty = await env.DB.prepare("SELECT c.name as county, COUNT(*) as cnt FROM r2_uploads u JOIN counties c ON u.county_id=c.id WHERE u.content_type='application/pdf' GROUP BY c.name ORDER BY cnt DESC LIMIT 20").all();
        return json({ ok: true, data: { totalPdfs: pdfCount?.cnt || 0, totalSizeMB: Math.round((pdfSize?.total || 0) / 1048576 * 100) / 100, byCounty: byCounty?.results || [] }, timestamp: now() }, 200, cors);
      }

      // ═══ v8.1: Instrument types list ═══════════════════════════════
      if (method === 'GET' && path === '/instruments') {
        const { results: dbTypes } = await env.DB.prepare("SELECT id, name, code FROM instrument_types ORDER BY name").all();
        return json({ ok: true, data: dbTypes || [], count: dbTypes?.length || 0, timestamp: now() }, 200, cors);
      }

      // ═══════════════════════════════════════════════════════════════
      // ═══ v9.0 AAAAA: CHAIN-OF-TITLE + D1 INGEST ENDPOINTS ═══════
      // ═══════════════════════════════════════════════════════════════

      // Chain-of-title query — used by autonomous orchestrator
      if (method === 'GET' && path === '/chain/query') {
        return json(await chainOfTitleQuery(env, {
          county: url.searchParams.get('county'),
          section: url.searchParams.get('section'),
          block: url.searchParams.get('block'),
          lot: url.searchParams.get('lot'),
          subdivision: url.searchParams.get('subdivision'),
          grantor: url.searchParams.get('grantor'),
          grantee: url.searchParams.get('grantee'),
          docNumber: url.searchParams.get('doc'),
          volume: url.searchParams.get('volume'),
          page: url.searchParams.get('page'),
          dateFrom: url.searchParams.get('from'),
          dateTo: url.searchParams.get('to'),
          limit: parseInt(url.searchParams.get('limit') || '200'),
        }), 200, cors);
      }
      if (method === 'POST' && path === '/chain/query') {
        const body = await request.json();
        return json(await chainOfTitleQuery(env, body), 200, cors);
      }

      // Chain-of-title stats — instrument type coverage, quality, gaps
      if (method === 'GET' && path.startsWith('/chain/stats/')) {
        const county = decodeURIComponent(path.split('/chain/stats/')[1]);
        return json(await chainOfTitleStats(env, county), 200, cors);
      }

      // Party search — find all instruments for a party across all counties
      if (method === 'GET' && path === '/chain/party') {
        const name = url.searchParams.get('name');
        const county = url.searchParams.get('county');
        if (!name) return json({ ok: false, error: 'name parameter required' }, 400, cors);
        await ensureDeedRecordsSchema(env);
        let sql = 'SELECT * FROM deed_records WHERE (grantor LIKE ? OR grantee LIKE ?)';
        const binds = [`%${name.toUpperCase()}%`, `%${name.toUpperCase()}%`];
        if (county) { sql += ' AND county = ?'; binds.push(county.toUpperCase()); }
        sql += ' ORDER BY recorded_date ASC LIMIT 500';
        const { results } = await env.DB.prepare(sql).bind(...binds).all();
        return json({ ok: true, data: { party: name, records: results || [], count: results?.length || 0 } }, 200, cors);
      }

      // Section search — find all instruments for a section
      if (method === 'GET' && path === '/chain/section') {
        const section = url.searchParams.get('section');
        const block = url.searchParams.get('block');
        const county = url.searchParams.get('county');
        if (!section) return json({ ok: false, error: 'section parameter required' }, 400, cors);
        await ensureDeedRecordsSchema(env);
        let sql = 'SELECT * FROM deed_records WHERE (section LIKE ? OR legal_description LIKE ?)';
        const binds = [`%${section}%`, `%SECTION ${section}%`];
        if (block) { sql += ' AND (block LIKE ? OR legal_description LIKE ?)'; binds.push(`%${block}%`, `%BLOCK ${block}%`); }
        if (county) { sql += ' AND county = ?'; binds.push(county.toUpperCase()); }
        sql += ' ORDER BY recorded_date ASC LIMIT 500';
        const { results } = await env.DB.prepare(sql).bind(...binds).all();
        return json({ ok: true, data: { section, block, records: results || [], count: results?.length || 0 } }, 200, cors);
      }

      // Backfill — ingest existing R2 JSON pages into deed_records
      if (method === 'POST' && path === '/chain/backfill') {
        const body = await request.json();
        if (!body.county) return json({ ok: false, error: 'county required' }, 400, cors);
        if (body.instrumentType) {
          return json(await backfillFromR2(env, body.county, body.instrumentType, body.maxPages || 100), 200, cors);
        }
        return json(await backfillAllFromR2(env, body.county, body.maxPages || 50), 200, cors);
      }

      // D1 ingest telemetry
      if (method === 'GET' && path === '/chain/telemetry') {
        return json(await getTelemetry(env), 200, cors);
      }

      // Deed records count per county
      if (method === 'GET' && path === '/chain/counties') {
        await ensureDeedRecordsSchema(env);
        const { results } = await env.DB.prepare(
          'SELECT county, COUNT(*) as records, COUNT(DISTINCT instrument_type) as types, AVG(data_quality_score) as avg_quality FROM deed_records GROUP BY county ORDER BY records DESC'
        ).all();
        return json({ ok: true, data: results || [], timestamp: now() }, 200, cors);
      }

      // Scrape progress by county — aggregated from scrape_jobs (the REAL source of truth)
      if (method === 'GET' && path === '/scrape/summary') {
        const { results } = await env.DB.prepare(
          `SELECT c.name as county, c.state, c.platform,
            COUNT(DISTINCT j.instrument_type_id) as types_scraped,
            SUM(j.scraped_records) as scraped_records,
            SUM(j.total_records) as total_records,
            SUM(CASE WHEN j.status='running' THEN 1 ELSE 0 END) as running_jobs,
            SUM(CASE WHEN j.status='completed' THEN 1 ELSE 0 END) as completed_jobs,
            SUM(CASE WHEN j.status='failed' THEN 1 ELSE 0 END) as failed_jobs,
            MAX(j.updated_at) as last_activity
          FROM scrape_jobs j
          JOIN counties c ON j.county_id = c.id
          GROUP BY c.name, c.state, c.platform
          ORDER BY SUM(j.scraped_records) DESC`
        ).all();
        return json({ ok: true, data: results || [], timestamp: now() }, 200, cors);
      }

      // Scrape watermarks — shows what's scraped, what's due, what's dormant
      if (method === 'GET' && path === '/chain/watermarks') {
        await ensureDeedRecordsSchema(env);
        const { results } = await env.DB.prepare(
          `SELECT w.county, w.instrument_type, w.last_page_scraped, w.records_in_db,
            w.new_records_last_run, w.consecutive_zero_new, w.scrape_priority,
            w.last_scraped_at, w.next_scrape_at,
            CASE WHEN w.next_scrape_at <= datetime('now') THEN 'due'
                 WHEN w.consecutive_zero_new >= 5 THEN 'dormant'
                 ELSE 'scheduled' END as status
          FROM scrape_watermarks w ORDER BY w.scrape_priority DESC, w.county, w.instrument_type`
        ).all();
        const summary = await env.DB.prepare(
          `SELECT county, SUM(records_in_db) as total_records, COUNT(*) as type_combos,
            SUM(CASE WHEN next_scrape_at <= datetime('now') THEN 1 ELSE 0 END) as due_now,
            SUM(CASE WHEN consecutive_zero_new >= 5 THEN 1 ELSE 0 END) as dormant,
            AVG(scrape_priority) as avg_priority
          FROM scrape_watermarks GROUP BY county ORDER BY total_records DESC`
        ).all();
        return json({ ok: true, data: { watermarks: results || [], county_summary: summary?.results || [] }, timestamp: now() }, 200, cors);
      }

      // Schema init endpoint (idempotent)
      if (method === 'POST' && path === '/chain/init') {
        schemaInitialized = false;
        await ensureDeedRecordsSchema(env);
        // Also ensure all new instrument types are in the instrument_types table
        let added = 0;
        for (const instType of INSTRUMENT_TYPES) {
          const existing = await env.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instType).first();
          if (!existing) {
            await env.DB.prepare("INSERT INTO instrument_types (name, code) VALUES (?, ?)").bind(instType, instType.replace(/ /g, '_')).run();
            added++;
          }
        }
        return json({ ok: true, data: { message: `Schema initialized. ${added} new instrument types added.`, totalTypes: INSTRUMENT_TYPES.length, newTypes: added } }, 200, cors);
      }

      // ═══════════════════════════════════════════════════════════════
      // LLM rotator status
      if (method === 'GET' && path === '/llm/status') {
        const status = LLM_PROVIDERS.map(p => ({
          name: p.name, model: p.model, type: p.type,
          fails: llmFailCounts[p.name] || 0,
          lastUsed: llmLastUsed[p.name] ? new Date(llmLastUsed[p.name]).toISOString() : null,
          available: !!env[p.type === 'github' ? 'GITHUB_TOKEN' : p.type === 'azure' ? 'AZURE_API_KEY' : p.type === 'openrouter' ? 'OPENROUTER_KEY' : p.type === 'groq' ? 'GROQ_API_KEY' : 'AI'],
        }));
        return json({ ok: true, data: { providers: status, currentIndex: llmRotatorIndex, totalProviders: LLM_PROVIDERS.length }, timestamp: now() }, 200, cors);
      }

      // LLM test endpoint — test the rotator
      if (method === 'POST' && path === '/llm/test') {
        const body = await request.json().catch(() => ({}));
        const legal = body.legal || 'SEC 270, BLK 13, H&GN RR CO SURVEY, TOYAH VALLEY GRAPE & ALFALFA SUBDIV, LOT 1, 10 ACRES';
        const result = await llmParseLegal(env, legal, body.county || 'REEVES');
        return json({ ok: true, data: result, timestamp: now() }, 200, cors);
      }

      // Trigger autonomous scrape for ALL active counties, ALL types (manual kickstart)
      // Uses batch queue sends and pre-cached instrument type IDs for speed
      if (method === 'POST' && path === '/scrape/permian') {
        const { results: allCounties } = await env.DB.prepare("SELECT id, name, base_url, platform FROM counties WHERE is_active = 1").all();
        const { results: allTypes } = await env.DB.prepare("SELECT id, name FROM instrument_types").all();
        const typeMap = {};
        for (const t of (allTypes || [])) typeMap[t.name] = t.id;
        let queued = 0;
        const batch = [];
        for (const county of (allCounties || [])) {
          for (const instTypeName of INSTRUMENT_TYPES) {
            const typeId = typeMap[instTypeName];
            if (!typeId) continue;
            batch.push({
              body: { type: 'discovery', county: county.name, countyId: county.id,
                baseUrl: county.base_url, instrumentType: instTypeName,
                instrumentTypeId: typeId, startPage: 0, endPage: 0,
                platform: county.platform || 'PUBLICSEARCH' },
            });
            queued++;
          }
        }
        // Send in batches of 100 (Queue batch limit)
        for (let i = 0; i < batch.length; i += 100) {
          await env.SCRAPE_QUEUE.sendBatch(batch.slice(i, i + 100));
        }
        return json({ ok: true, data: { message: `Queued ${queued} scrape jobs for ${allCounties?.length || 0} counties`, counties: (allCounties || []).map(c => c.name), instrumentTypes: INSTRUMENT_TYPES.length, totalJobs: queued }, timestamp: now() }, 200, cors);
      }

      // ═══ END v9.0 CHAIN-OF-TITLE ENDPOINTS ═══════════════════════
      // ═══════════════════════════════════════════════════════════════

      // ═══ v8.1: Reset all jobs for a county ════════════════════════
      if (method === 'POST' && path === '/jobs/reset') {
        const body = await request.json();
        if (!body.county) return json({ ok: false, error: 'county required' }, 400, cors);
        const county = await env.DB.prepare("SELECT id FROM counties WHERE UPPER(name)=UPPER(?)").bind(body.county.toUpperCase()).first();
        if (!county) return json({ ok: false, error: `County "${body.county}" not found` }, 404, cors);
        await env.DB.prepare("DELETE FROM scrape_jobs WHERE county_id = ?").bind(county.id).run();
        return json({ ok: true, data: { message: `All jobs reset for ${body.county}` }, timestamp: now() }, 200, cors);
      }

      // ═══ v8.1: WarpSpeed date-range scan (full history in chunks) ══
      if (method === 'POST' && path === '/warpspeed/history') {
        const body = await request.json();
        const countyName = body.county;
        const startYear = body.startYear || 2000;
        const chunks = generateDateChunks(startYear);
        const chunkResults = [];
        let totalRecords = 0;
        for (let i = 0; i < Math.min(chunks.length, 5); i++) {
          try {
            const r = await warpSpeedScrape(countyName, chunks[i].start, chunks[i].end, env);
            chunkResults.push({ chunk: i, dates: chunks[i], records: r.records || 0, elapsed: r.elapsed });
            totalRecords += r.records || 0;
          } catch (err) { chunkResults.push({ chunk: i, dates: chunks[i], error: err.message }); }
        }
        return json({ ok: true, data: { county: countyName, totalChunks: chunks.length, processedChunks: chunkResults.length, totalRecords, chunks: chunkResults }, timestamp: now() }, 200, cors);
      }

      // ═══ v8.1: Evasion engine info ════════════════════════════════
      if (method === 'GET' && path === '/evasion') {
        const sample = generateIdentity();
        return json({ ok: true, data: {
          engine: 'v8.1 OMEGA ULTIMATE', techniques: 120, userAgents: EVASION.USER_AGENTS.length, acceptSets: EVASION.ACCEPT_SETS.length, connections: EVASION.CONNECTIONS.length,
          features: ['Matched Sec-CH-UA per UA', 'Platform detection (Win/Mac/Linux)', 'Connection simulation (downlink/rtt)', 'DNT randomization', 'Referer chain', 'Request timing jitter', 'Circuit breaker per county', 'Exponential backoff with jitter', 'Proxy difficulty routing (direct/tunnel/residential)', 'Browser Rendering evasion (webdriver/plugins/chrome/permissions)'],
          sampleIdentity: { ua: sample.ua, secChUa: sample.secChUa, headers: Object.keys(sample.headers) },
        }, timestamp: now() }, 200, cors);
      }

      // ═══ DOCUMENT INTELLIGENCE ENDPOINTS ══════════════════════════

      // Pipeline stats — how many docs at each stage
      if (method === 'GET' && path === '/pipeline/stats') {
        const total = await env.DB.prepare("SELECT COUNT(*) as cnt FROM document_pipeline").first();
        const byStatus = await env.DB.prepare("SELECT status, COUNT(*) as cnt FROM document_pipeline GROUP BY status ORDER BY cnt DESC").all();
        const byCounty = await env.DB.prepare("SELECT c.name as county, COUNT(*) as cnt, AVG(dp.ocr_confidence) as avg_confidence FROM document_pipeline dp JOIN counties c ON dp.county_id=c.id GROUP BY c.name ORDER BY cnt DESC LIMIT 20").all();
        const analyzed = await env.DB.prepare("SELECT COUNT(*) as cnt FROM document_pipeline WHERE status='analyzed'").first();
        const avgConf = await env.DB.prepare("SELECT AVG(ocr_confidence) as avg FROM document_pipeline WHERE status='analyzed'").first();
        const withEntities = await env.DB.prepare("SELECT COUNT(*) as cnt FROM document_pipeline WHERE section_block_survey IS NOT NULL OR consideration_extracted IS NOT NULL OR acreage_extracted IS NOT NULL").first();
        return json({ ok: true, data: {
          totalDocuments: total?.cnt || 0,
          analyzedDocuments: analyzed?.cnt || 0,
          averageConfidence: Math.round((avgConf?.avg || 0) * 100) / 100,
          withExtractedEntities: withEntities?.cnt || 0,
          byStatus: byStatus?.results || [],
          byCounty: byCounty?.results || [],
          ocrModel: 'llama-3.2-11b-vision-instruct',
          pipelineVersion: '8.1.0',
        }, timestamp: now() }, 200, cors);
      }

      // Get single document analysis with full cloud context
      if (method === 'GET' && path.startsWith('/pipeline/doc/')) {
        const docId = decodeURIComponent(path.split('/pipeline/doc/')[1]);
        const doc = await env.DB.prepare("SELECT dp.*, c.name as county_name, it.name as instrument_name FROM document_pipeline dp LEFT JOIN counties c ON dp.county_id=c.id LEFT JOIN instrument_types it ON dp.instrument_type_id=it.id WHERE dp.document_id=?").bind(docId).first();
        if (!doc) return json({ ok: false, error: `Document not found: ${docId}` }, 404, cors);
        return json({ ok: true, data: { document: doc, cloudContext: buildCloudContext(doc) }, timestamp: now() }, 200, cors);
      }

      // Search analyzed documents by extracted entities
      if (method === 'GET' && path === '/pipeline/search') {
        const grantor = url.searchParams.get('grantor');
        const grantee = url.searchParams.get('grantee');
        const section = url.searchParams.get('section');
        const county = url.searchParams.get('county');
        const minConfidence = parseFloat(url.searchParams.get('min_confidence') || '0');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let sql = "SELECT dp.document_id, dp.status, dp.ocr_confidence, dp.grantor_extracted, dp.grantee_extracted, dp.legal_description_extracted, dp.section_block_survey, dp.consideration_extracted, dp.acreage_extracted, dp.mineral_interest_pct, dp.royalty_interest_pct, dp.volume_page, dp.r2_pdf_key, c.name as county_name, it.name as instrument_name FROM document_pipeline dp LEFT JOIN counties c ON dp.county_id=c.id LEFT JOIN instrument_types it ON dp.instrument_type_id=it.id WHERE dp.status='analyzed'";
        const binds = [];
        if (grantor) { sql += " AND dp.grantor_extracted LIKE ?"; binds.push(`%${grantor}%`); }
        if (grantee) { sql += " AND dp.grantee_extracted LIKE ?"; binds.push(`%${grantee}%`); }
        if (section) { sql += " AND dp.section_block_survey LIKE ?"; binds.push(`%${section}%`); }
        if (county) { sql += " AND c.name LIKE ?"; binds.push(`%${county}%`); }
        if (minConfidence > 0) { sql += " AND dp.ocr_confidence >= ?"; binds.push(minConfidence); }
        sql += " ORDER BY dp.ocr_confidence DESC LIMIT ? OFFSET ?";
        binds.push(limit, offset);

        const { results } = await env.DB.prepare(sql).bind(...binds).all();
        return json({ ok: true, data: (results || []).map(r => ({ ...r, cloudContext: { pdfPath: r.r2_pdf_key, textPath: r.r2_pdf_key?.replace(/\.pdf$/i, '.txt'), analysisPath: r.r2_pdf_key?.replace(/\.pdf$/i, '_analysis.json'), bucket: 'echo-prime-knowledge' } })), count: results?.length || 0, timestamp: now() }, 200, cors);
      }

      // Manually trigger OCR for a specific document already in R2
      if (method === 'POST' && path === '/pipeline/analyze') {
        const body = await request.json();
        if (!body.documentId || !body.county) return json({ ok: false, error: 'documentId and county required' }, 400, cors);
        const countyRow = await env.DB.prepare("SELECT id FROM counties WHERE UPPER(name)=UPPER(?)").bind(body.county.toUpperCase()).first();
        if (!countyRow) return json({ ok: false, error: `County not found: ${body.county}` }, 404, cors);
        const doc = await env.DB.prepare("SELECT * FROM document_pipeline WHERE county_id=? AND document_id=?").bind(countyRow.id, body.documentId).first();
        if (!doc) return json({ ok: false, error: `Document not in pipeline: ${body.documentId}` }, 404, cors);
        if (doc.status === 'analyzed' && !body.force) return json({ ok: true, data: { message: 'Already analyzed', cloudContext: buildCloudContext(doc) }, timestamp: now() }, 200, cors);
        await queueOcrJob(env, body.county.toUpperCase(), countyRow.id, doc.instrument_type_id ? '' : '', doc.instrument_type_id || 0, body.documentId, doc.r2_pdf_key);
        return json({ ok: true, data: { message: `OCR job queued for ${body.documentId}`, status: 'ocr_queued' }, timestamp: now() }, 200, cors);
      }

      // Bulk re-analyze: re-queue all failed or pending documents
      if (method === 'POST' && path === '/pipeline/reanalyze') {
        const body = await request.json();
        const targetStatus = body.status || 'failed';
        const limit = Math.min(body.limit || 50, 200);
        const { results: docs } = await env.DB.prepare("SELECT dp.*, c.name as county_name FROM document_pipeline dp JOIN counties c ON dp.county_id=c.id WHERE dp.status=? LIMIT ?").bind(targetStatus, limit).all();
        if (!docs?.length) return json({ ok: true, data: { requeued: 0, message: `No ${targetStatus} documents to re-analyze` }, timestamp: now() }, 200, cors);
        let requeued = 0;
        for (const doc of docs) {
          try {
            await queueOcrJob(env, doc.county_name, doc.county_id, '', doc.instrument_type_id || 0, doc.document_id, doc.r2_pdf_key);
            requeued++;
          } catch {}
        }
        return json({ ok: true, data: { requeued, total: docs.length, message: `${requeued} documents re-queued for OCR` }, timestamp: now() }, 200, cors);
      }

      // Cloud context map — show R2 hierarchy for a county
      if (method === 'GET' && path === '/pipeline/cloud-map') {
        const county = url.searchParams.get('county');
        if (!county) return json({ ok: false, error: 'county param required' }, 400, cors);
        const countyRow = await env.DB.prepare("SELECT id FROM counties WHERE UPPER(name)=UPPER(?)").bind(county.toUpperCase()).first();
        if (!countyRow) return json({ ok: false, error: `County not found: ${county}` }, 404, cors);
        const docs = await env.DB.prepare("SELECT document_id, r2_pdf_key, r2_text_key, status, ocr_confidence, grantor_extracted, section_block_survey FROM document_pipeline WHERE county_id=? ORDER BY created_at DESC LIMIT 100").bind(countyRow.id).all();
        const uploads = await env.DB.prepare("SELECT r2_key, file_size, content_type, uploaded_at FROM r2_uploads WHERE county_id=? ORDER BY uploaded_at DESC LIMIT 100").bind(countyRow.id).all();
        return json({ ok: true, data: {
          county: county.toUpperCase(),
          cloudStructure: {
            bucket: 'echo-prime-knowledge',
            basePath: `ENCORE/${county.toUpperCase()}/`,
            tylerPath: `ENCORE/TYLER/${county.toUpperCase()}/`,
          },
          pipeline: { total: docs?.results?.length || 0, documents: docs?.results || [] },
          uploads: { total: uploads?.results?.length || 0, files: uploads?.results || [] },
        }, timestamp: now() }, 200, cors);
      }

      // Get OCR text for a document
      if (method === 'GET' && path.startsWith('/pipeline/text/')) {
        const docId = decodeURIComponent(path.split('/pipeline/text/')[1]);
        const doc = await env.DB.prepare("SELECT extracted_text, document_id, ocr_confidence FROM document_pipeline WHERE document_id=?").bind(docId).first();
        if (!doc || !doc.extracted_text) return json({ ok: false, error: 'No OCR text available' }, 404, cors);
        return new Response(doc.extracted_text, { headers: { 'Content-Type': 'text/plain', ...cors } });
      }

      // ═══ WarpSpeed → PDF Bridge: queue targeted PDF downloads from CSV results ══
      if (method === 'POST' && path === '/warpspeed/fetch-pdfs') {
        const body = await request.json();
        const countyName = body.county;
        if (!countyName) return json({ ok: false, error: 'county required' }, 400, cors);
        const key = countyName.toLowerCase().replace(/\s+/g, '');
        const tylerInfo = TYLER_COUNTIES[key];
        if (!tylerInfo) return json({ ok: false, error: `${countyName} not in Tyler Tech registry` }, 404, cors);
        const baseUrl = `https://${tylerInfo.subdomain}tx-web.tylerhost.net`;
        const maxDocs = Math.min(body.limit || 25, 50);
        const session = await setupTylerSession(baseUrl, env);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (body.days || 30) * 86400000);
        const search = await tylerSubmitSearch(session, body.instrumentType || '', fmtDate(startDate), fmtDate(endDate), env);
        if (search.totalPages === 0) return json({ ok: true, data: { message: 'No results', pdfs: 0 } }, 200, cors);
        const html = await tylerFetchResultsPage(session, 1, env);
        const records = parseTylerResults(html);
        const withPdfUrls = records.filter(r => r.pdfUrl).length;
        const samplePdfUrls = records.filter(r => r.pdfUrl).slice(0, 3).map(r => ({ id: r.id, pdfUrl: r.pdfUrl }));
        const debugLog = [];
        const pdfCount = await downloadTylerPdfs(env, session, records, countyName.toUpperCase(), body.instrumentType || 'DEED', maxDocs, debugLog);
        return json({ ok: true, data: { county: countyName, pdfsDownloaded: pdfCount, totalRecords: records.length, withPdfUrls, samplePdfUrls, debug: debugLog, message: `${pdfCount} PDFs downloaded and queued for OCR` }, timestamp: now() }, 200, cors);
      }

      // ═══ Pipeline review queue: docs flagged for human review ══════════
      if (method === 'GET' && path === '/pipeline/review') {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
        const { results } = await env.DB.prepare("SELECT dp.document_id, dp.ocr_confidence, dp.ocr_model, dp.grantor_extracted, dp.grantee_extracted, dp.section_block_survey, dp.r2_pdf_key, dp.error_message, c.name as county_name, it.name as instrument_name FROM document_pipeline dp LEFT JOIN counties c ON dp.county_id=c.id LEFT JOIN instrument_types it ON dp.instrument_type_id=it.id WHERE dp.ocr_confidence < 0.4 AND dp.status = 'analyzed' ORDER BY dp.ocr_confidence ASC LIMIT ?").bind(limit).all();
        return json({ ok: true, data: results || [], count: results?.length || 0, description: 'Documents with confidence < 0.4 flagged for human review', timestamp: now() }, 200, cors);
      }

      // ═══ Cross-reference search: find docs sharing same property or party ══
      if (method === 'GET' && path === '/pipeline/cross-refs') {
        const grantor = url.searchParams.get('grantor');
        const property = url.searchParams.get('property');
        if (!grantor && !property) return json({ ok: false, error: 'grantor or property param required' }, 400, cors);
        let sql, binds;
        if (property) {
          sql = "SELECT dp.document_id, dp.grantor_extracted, dp.grantee_extracted, dp.consideration_extracted, dp.ocr_confidence, c.name as county_name, it.name as instrument_name FROM document_pipeline dp LEFT JOIN counties c ON dp.county_id=c.id LEFT JOIN instrument_types it ON dp.instrument_type_id=it.id WHERE dp.section_block_survey LIKE ? ORDER BY dp.created_at";
          binds = [`%${property}%`];
        } else {
          sql = "SELECT dp.document_id, dp.grantee_extracted, dp.section_block_survey, dp.consideration_extracted, dp.ocr_confidence, c.name as county_name, it.name as instrument_name FROM document_pipeline dp LEFT JOIN counties c ON dp.county_id=c.id LEFT JOIN instrument_types it ON dp.instrument_type_id=it.id WHERE dp.grantor_extracted LIKE ? OR dp.grantee_extracted LIKE ? ORDER BY dp.created_at";
          binds = [`%${grantor}%`, `%${grantor}%`];
        }
        const { results } = await env.DB.prepare(sql + " LIMIT 100").bind(...binds).all();
        return json({ ok: true, data: results || [], count: results?.length || 0, searchType: property ? 'property_chain' : 'party_history', timestamp: now() }, 200, cors);
      }

      // ═══ Internal: Serve PDF from R2 for Browser Rendering ═════════════════
      if (method === 'GET' && path.startsWith('/internal/pdf/')) {
        const r2Key = decodeURIComponent(path.slice('/internal/pdf/'.length));
        const obj = await env.R2_RECORDS.get(r2Key);
        if (!obj) return new Response('Not found', { status: 404 });
        return new Response(obj.body, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': String(obj.size),
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
          },
        });
      }

      // ═══ Debug: Probe Tyler document page to find PDF URL ═════════════════
      if (method === 'GET' && path === '/debug/tyler-pdf') {
        const docUrl = url.searchParams.get('url');
        const countyParam = url.searchParams.get('county') || 'ector';
        if (!docUrl) return json({ ok: false, error: 'url param required (e.g. /web/document/DOC1328S341?search=DOCSEARCH144S1)' }, 400, cors);
        const key = countyParam.toLowerCase().replace(/\s+/g, '');
        const tylerInfo = TYLER_COUNTIES[key];
        if (!tylerInfo) return json({ ok: false, error: `${countyParam} not in Tyler registry` }, 404, cors);
        const baseUrl = `https://${tylerInfo.subdomain}tx-web.tylerhost.net`;
        const session = await setupTylerSession(baseUrl, env);
        const fullUrl = docUrl.startsWith('http') ? docUrl : `${session.origin}${docUrl}`;
        const hdrs = { ...session.identity.headers };
        delete hdrs['Accept-Encoding'];
        hdrs['Cookie'] = cookieHeader(session.cookies);
        hdrs['Accept'] = 'text/html, */*';
        const resp = await fetch(fullUrl, { headers: hdrs, redirect: 'follow' });
        const html = await resp.text();
        const pdfJsMatch = html.match(/pdfJsUrl\s*[=:]\s*["']([^"']+)["']/i);
        const attMatch = html.match(/attachmentUrl\s*[=:]\s*["']([^"']+)["']/i);
        const imgMatch = html.match(/(\/web\/image\/[^"'\s]+)/i);
        const getPdfMatch = html.match(/(\/web\/[^"'\s]*GetPdf[^"'\s]*)/i);
        const iframeMatch = html.match(/<iframe[^>]*src=["']([^"']*\.pdf[^"']*)["']/i);
        const viewImageMatch = html.match(/(\/web\/[^"'\s]*viewImage[^"'\s]*)/i);
        const allDocUrls = [...new Set((html.match(/\/web\/[^"'\s<>]{5,80}/gi) || []))].slice(0, 30);
        return json({
          ok: true,
          htmlLength: html.length,
          contentType: resp.headers.get('content-type'),
          patterns: {
            pdfJsUrl: pdfJsMatch?.[1] || null,
            attachmentUrl: attMatch?.[1] || null,
            webImage: imgMatch?.[1] || null,
            getPdf: getPdfMatch?.[1] || null,
            iframe: iframeMatch?.[1] || null,
            viewImage: viewImageMatch?.[1] || null,
          },
          allWebUrls: allDocUrls,
          htmlSnippet: html.slice(0, 500),
        }, 200, cors);
      }

      // ╔════════════════════════════════════════════════════════════════╗
      // ║  ODYSSEY COURT RECORD ENDPOINTS — NEW in v9.1                  ║
      // ║  Criminal cases, warrants, affidavits, orders from Odyssey     ║
      // ╚════════════════════════════════════════════════════════════════╝

      // Store Odyssey portal credentials (for portals requiring login)
      if (method === 'POST' && path === '/odyssey/credentials') {
        const body = await request.json();
        if (!body.email || !body.password) return json({ ok: false, error: 'email and password required' }, 400, cors);
        await env.DEDUP_KV.put('odyssey_creds', JSON.stringify({ email: body.email, password: body.password }), { expirationTtl: 86400 * 365 }); // 1 year
        return json({ ok: true, data: { message: 'Odyssey credentials stored', email: body.email } }, 200, cors);
      }

      // List all Odyssey portals
      if (method === 'GET' && path === '/odyssey/portals') {
        return json({ ok: true, data: Object.entries(ODYSSEY_PORTALS).map(([key, val]) => ({ key, name: val.name, url: val.url, state: val.state, courts: val.courts, caseTypes: ODYSSEY_CASE_TYPES, documentTypes: ODYSSEY_DOCUMENT_TYPES })), count: Object.keys(ODYSSEY_PORTALS).length, timestamp: now() }, 200, cors);
      }

      // Smart Search — search for cases on an Odyssey portal (browser-based)
      if (method === 'POST' && path === '/odyssey/search') {
        const body = await request.json();
        const county = body.county;
        const searchTerm = body.search || body.query || body.term;
        if (!county || !searchTerm) return json({ ok: false, error: 'county and search (or query) required' }, 400, cors);
        const portal = getOdysseyPortal(county);
        if (!portal) return json({ ok: false, error: `Odyssey portal not found for: ${county}. Available: ${Object.keys(ODYSSEY_PORTALS).join(', ')}` }, 404, cors);
        const result = await odysseyBrowserSearch(env, portal.url, searchTerm, body.searchType || 'smart');
        // Ingest results to D1
        let ingested = 0;
        if (result.ok && result.cases?.length > 0) {
          for (const c of result.cases) {
            try {
              await odysseyIngestCase(env, county, { ...c, portalUrl: portal.url });
              ingested++;
            } catch (e) { console.error(`[ODYSSEY-SEARCH] ingest error: ${e.message}`); }
          }
        }
        return json({ ok: result.ok, data: { ...result, ingested, portal: portal.name }, timestamp: now() }, result.ok ? 200 : 500, cors);
      }

      // Get case detail (with documents list)
      if (method === 'POST' && path === '/odyssey/case') {
        const body = await request.json();
        const county = body.county;
        const caseUrl = body.caseUrl || body.url;
        if (!county || !caseUrl) return json({ ok: false, error: 'county and caseUrl required' }, 400, cors);
        const portal = getOdysseyPortal(county);
        if (!portal) return json({ ok: false, error: `Odyssey portal not found for: ${county}` }, 404, cors);
        const result = await odysseyCaseDetail(env, portal.url, caseUrl);
        // Ingest to D1
        if (result.ok && result.caseDetail) {
          try { await odysseyIngestCase(env, county, { ...result.caseDetail, portalUrl: portal.url }); } catch {}
        }
        return json({ ok: result.ok, data: result, timestamp: now() }, result.ok ? 200 : 500, cors);
      }

      // Search court_records D1 table
      if (method === 'GET' && path === '/odyssey/records') {
        await ensureCourtRecordsSchema(env);
        const county = url.searchParams.get('county');
        const caseNumber = url.searchParams.get('case_number');
        const partyName = url.searchParams.get('party');
        const caseType = url.searchParams.get('type');
        const judge = url.searchParams.get('judge');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);

        let sql = 'SELECT * FROM court_records WHERE 1=1';
        const binds = [];
        if (county) { sql += ' AND UPPER(county) = UPPER(?)'; binds.push(county); }
        if (caseNumber) { sql += ' AND case_number LIKE ?'; binds.push(`%${caseNumber}%`); }
        if (partyName) { sql += ' AND (party_name LIKE ? OR case_style LIKE ?)'; binds.push(`%${partyName}%`, `%${partyName}%`); }
        if (caseType) { sql += ' AND UPPER(case_type) LIKE UPPER(?)'; binds.push(`%${caseType}%`); }
        if (judge) { sql += ' AND judge LIKE ?'; binds.push(`%${judge}%`); }
        sql += ` ORDER BY file_date DESC LIMIT ${limit}`;

        const { results: records } = await env.DB.prepare(sql).bind(...binds).all();
        return json({ ok: true, data: records || [], count: records?.length || 0, timestamp: now() }, 200, cors);
      }

      // Court records stats
      if (method === 'GET' && path === '/odyssey/stats') {
        await ensureCourtRecordsSchema(env);
        const total = await env.DB.prepare('SELECT COUNT(*) as cnt FROM court_records').first();
        const byCounty = await env.DB.prepare('SELECT county, COUNT(*) as cnt FROM court_records GROUP BY county ORDER BY cnt DESC').all();
        const byType = await env.DB.prepare('SELECT case_type, COUNT(*) as cnt FROM court_records GROUP BY case_type ORDER BY cnt DESC').all();
        const byJudge = await env.DB.prepare('SELECT judge, COUNT(*) as cnt FROM court_records GROUP BY judge ORDER BY cnt DESC LIMIT 20').all();
        const docTotal = await env.DB.prepare('SELECT COUNT(*) as cnt FROM court_documents').first();
        return json({ ok: true, data: {
          totalRecords: total?.cnt || 0,
          totalDocuments: docTotal?.cnt || 0,
          byCounty: byCounty?.results || [],
          byType: byType?.results || [],
          byJudge: byJudge?.results || [],
          portals: Object.keys(ODYSSEY_PORTALS).length,
          caseTypes: ODYSSEY_CASE_TYPES,
          documentTypes: ODYSSEY_DOCUMENT_TYPES,
        }, timestamp: now() }, 200, cors);
      }

      // Court documents for a case
      if (method === 'GET' && path === '/odyssey/documents') {
        await ensureCourtRecordsSchema(env);
        const caseNumber = url.searchParams.get('case_number');
        const county = url.searchParams.get('county');
        if (!caseNumber) return json({ ok: false, error: 'case_number param required' }, 400, cors);
        let sql = 'SELECT * FROM court_documents WHERE case_number LIKE ?';
        const binds = [`%${caseNumber}%`];
        if (county) { sql += ' AND UPPER(county) = UPPER(?)'; binds.push(county); }
        sql += ' ORDER BY filed_date DESC';
        const { results } = await env.DB.prepare(sql).bind(...binds).all();
        return json({ ok: true, data: results || [], count: results?.length || 0, timestamp: now() }, 200, cors);
      }

      // 404
      return json({ ok: false, error: 'Not found', data: { service: `ShadowGlass v${VERSION} — ${CODENAME}`, endpoints: ['GET /','GET /health','GET /stats','GET /stats/pdfs','GET /status','GET /counties','GET /instruments','GET /search','GET /record/{key}','GET /circuits','GET /evasion','GET /tyler/counties','GET /test/tyler','GET /pipeline/stats','GET /pipeline/doc/{id}','GET /pipeline/search','GET /pipeline/cloud-map','GET /pipeline/text/{id}','GET /pipeline/review','GET /pipeline/cross-refs','GET /chain/query','GET /chain/stats/{county}','GET /chain/party','GET /chain/section','GET /chain/telemetry','GET /chain/counties','POST /chain/query','POST /chain/backfill','POST /chain/init','POST /scrape','POST /scrape/all','POST /scrape/multi','POST /scrape/direct','POST /scrape/platform','POST /discover','POST /warpspeed','POST /warpspeed/all','POST /warpspeed/history','POST /warpspeed/fetch-pdfs','POST /pipeline/analyze','POST /pipeline/reanalyze','POST /jobs/fix-stale','POST /jobs/reset','POST /pause/{id}','POST /resume/{id}','GET /odyssey/portals','POST /odyssey/search','POST /odyssey/case','GET /odyssey/records','GET /odyssey/stats','GET /odyssey/documents'] } }, 404, cors);
    } catch (err) {
      return json({ ok: false, error: err instanceof Error ? err.message : String(err), timestamp: now() }, 500, cors);
    }
  },

  // ═══ Queue Consumer ═════════════════════════════════════════
  async queue(batch, env) {
    console.log(`[QUEUE v8] Received ${batch.messages.length} messages`);
    let tylerProcessed = false;
    for (const message of batch.messages) {
      const msg = message.body;
      console.log(`[QUEUE v8] type=${msg.type} county=${msg.county} itype=${msg.instrumentType} platform=${msg.platform}`);
      try {
        // v9.2 FAST-DRAIN: Skip browser-platform messages instantly when ALL jobs for that platform are paused
        // Only applies to browser platforms (PUBLICSEARCH, TEXASFILE) — Tyler uses per-job check below
        if (!batch._pausedPlatforms) {
          try {
            // A platform is "fully paused" only if ALL its active county jobs are paused (not just some)
            const { results: pp } = await env.DB.prepare(`
              SELECT c.platform, COUNT(*) as total, SUM(CASE WHEN sj.status='paused' THEN 1 ELSE 0 END) as paused_cnt
              FROM scrape_jobs sj JOIN counties c ON sj.county_id=c.id WHERE c.is_active=1
              GROUP BY c.platform HAVING total = paused_cnt
            `).all();
            batch._pausedPlatforms = new Set((pp || []).map(r => r.platform));
          } catch { batch._pausedPlatforms = new Set(); }
        }
        if (batch._pausedPlatforms.has(msg.platform)) { message.ack(); continue; }
        // Check if individual job is paused — ack and skip ALL message types for paused jobs
        if (msg.countyId && msg.instrumentTypeId) {
          const jobCheck = await env.DB.prepare("SELECT status FROM scrape_jobs WHERE county_id=? AND instrument_type_id=?").bind(msg.countyId, msg.instrumentTypeId).first();
          if (jobCheck?.status === 'paused') { console.log(`[QUEUE] Skipping paused: ${msg.county}/${msg.instrumentType}`); message.ack(); continue; }
        }
        if (msg.platform === 'TYLER_TECH' && msg.type === 'scrape_batch' && tylerProcessed) { message.retry(); continue; }
        if (msg.platform !== 'TYLER_TECH') {
          const rl = new RateLimiter(env.DEDUP_KV);
          if (!await rl.canProceed()) { console.log(`[QUEUE] Rate limited — retrying ${msg.county}/${msg.instrumentType}`); message.retry(); continue; }
          // For browser-based scraping, also check browser concurrency
          if (msg.platform !== 'TYLER_TECH' && (msg.type === 'discovery' || msg.type === 'scrape_batch')) {
            if (!await rl.acquireBrowser()) { console.log(`[QUEUE] Browser slots full — retrying ${msg.county}/${msg.instrumentType}`); message.retry(); continue; }
          }
        }
        if (msg.type === 'discovery') {
          const result = await discoverCounty(env, msg);
          // Release browser slot after discovery completes
          if (msg.platform !== 'TYLER_TECH') { try { const rl2 = new RateLimiter(env.DEDUP_KV); await rl2.releaseBrowser(); } catch {} }
          // Update job record with total (use max of current and new to handle partitioned discoveries accumulating)
          if (result.autoPartitioned) {
            // Auto-partitioned: update total but don't enqueue batches — each partition does its own
            await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, total_records, updated_at) VALUES (?, ?, 'running', ?, datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET total_records = ?, status = 'running', updated_at = datetime('now')`).bind(msg.countyId, msg.instrumentTypeId, result.totalRecords, result.totalRecords).run();
            console.log(`[QUEUE] Auto-partitioned ${msg.county}/${msg.instrumentType}: ${result.totalRecords} records into ${result.partitions} date ranges`);
          } else if (result.totalRecords > 0) {
            // Regular discovery or date-partitioned sub-discovery: enqueue batches
            if (msg.dateRange) {
              // Date-partitioned sub-discovery: accumulate records to parent job
              await env.DB.prepare(`UPDATE scrape_jobs SET scraped_records = 0, status = 'running', updated_at = datetime('now') WHERE county_id = ? AND instrument_type_id = ?`).bind(msg.countyId, msg.instrumentTypeId).run();
              console.log(`[QUEUE] Partition ${msg.dateLabel || msg.dateRange}: ${result.totalRecords} records for ${msg.county}/${msg.instrumentType}`);
            } else {
              await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, total_records, updated_at) VALUES (?, ?, 'pending', ?, datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET total_records = ?, updated_at = datetime('now')`).bind(msg.countyId, msg.instrumentTypeId, result.totalRecords, result.totalRecords).run();
            }
            const isTyler = msg.platform === 'TYLER_TECH';
            const totalPages = Math.ceil(result.totalRecords / (isTyler ? 100 : 50));
            // Pass dateRange through to batch messages
            const batchMsg = msg.dateRange ? { ...msg, dateRange: msg.dateRange, dateLabel: msg.dateLabel } : msg;
            await enqueueBatches(env, batchMsg, totalPages, 1);
          } else {
            await env.DB.prepare(`INSERT INTO scrape_jobs (county_id, instrument_type_id, status, total_records, updated_at) VALUES (?, ?, 'pending', 0, datetime('now')) ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET updated_at = datetime('now')`).bind(msg.countyId, msg.instrumentTypeId).run();
          }
          message.ack();
        } else if (msg.type === 'scrape_batch') {
          const job = await env.DB.prepare("SELECT status FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?").bind(msg.countyId, msg.instrumentTypeId).first();
          if (job?.status === 'paused') { if (msg.platform !== 'TYLER_TECH') { try { const rl2 = new RateLimiter(env.DEDUP_KV); await rl2.releaseBrowser(); } catch {} } message.ack(); continue; }
          if (msg.platform === 'TYLER_TECH') tylerProcessed = true;
          let results;
          const MAX_BROWSER_RETRIES = 2;
          for (let browserAttempt = 0; browserAttempt <= MAX_BROWSER_RETRIES; browserAttempt++) {
            try {
              results = await scrapeBatch(env, msg);
              break; // success — exit retry loop
            } catch (browserErr) {
              const browserErrMsg = browserErr instanceof Error ? browserErr.message : String(browserErr);
              const isWebSocketDead = browserErrMsg.includes('WebSocket') || browserErrMsg.includes('Target closed') || browserErrMsg.includes('Protocol error') || browserErrMsg.includes('Session closed');
              if (isWebSocketDead && browserAttempt < MAX_BROWSER_RETRIES) {
                console.log(`[QUEUE] Browser session died (attempt ${browserAttempt + 1}/${MAX_BROWSER_RETRIES + 1}): ${browserErrMsg}. Retrying with fresh browser...`);
                await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000)); // backoff 2-4s
                continue; // retry with new browser session
              }
              // Release browser slot on final failure
              if (msg.platform !== 'TYLER_TECH') { try { const rl2 = new RateLimiter(env.DEDUP_KV); await rl2.releaseBrowser(); } catch {} }
              throw browserErr; // propagate to outer catch for message.retry()
            } finally {
              if (results) {
                // Release browser slot after successful scrape
                if (msg.platform !== 'TYLER_TECH') { try { const rl2 = new RateLimiter(env.DEDUP_KV); await rl2.releaseBrowser(); } catch {} }
              }
            }
          }
          const totalRecords = results.reduce((s, r) => s + r.records.length, 0);
          try { await env.DB.prepare(`INSERT INTO scrape_logs (job_id, level, message, metadata, created_at) VALUES ((SELECT id FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?), 'info', ?, ?, datetime('now'))`).bind(msg.countyId, msg.instrumentTypeId, `Batch ${msg.startPage}-${msg.endPage}: ${totalRecords} records`, JSON.stringify({ pages: results.length, records: totalRecords })).run(); } catch {}

          // ═══ v9.1: D1 DIRECT INGEST + scraped_records tracking ═══
          if (totalRecords > 0) {
            let batchIngested = 0, batchSkipped = 0, batchFailed = 0;
            for (const pageResult of results) {
              try {
                const ingestResult = await ingestBatchToD1(env, pageResult);
                batchIngested += ingestResult.ingested;
                batchSkipped += ingestResult.skipped;
                batchFailed += ingestResult.failed;
              } catch (e) {
                console.error(`[D1-INGEST-ERR] ${msg.county}/${msg.instrumentType}: ${e.message}`);
              }
            }
            // v9.1 FIX: Update scraped_records counter so jobs can reach completion
            const totalProcessed = batchIngested + batchSkipped; // ingested + deduped both count as "scraped"
            if (totalProcessed > 0) {
              try {
                await env.DB.prepare(`UPDATE scrape_jobs SET scraped_records = scraped_records + ?, updated_at = datetime('now') WHERE county_id = ? AND instrument_type_id = ?`).bind(totalProcessed, msg.countyId, msg.instrumentTypeId).run();
              } catch (e) { console.error(`[COUNTER-ERR] ${msg.county}: ${e.message}`); }
            }
            if (batchIngested > 0) {
              console.log(`[D1-PIPELINE] ${msg.county}/${msg.instrumentType}: ${batchIngested} ingested, ${batchSkipped} dup, ${batchFailed} fail (counter +${totalProcessed})`);
            }
          }
          // ═══ END v9.1 D1 INGEST ═══════════════════════════════════════════════════════════

          const cp = await env.DB.prepare("SELECT scraped_records, total_records FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?").bind(msg.countyId, msg.instrumentTypeId).first();
          if (cp && cp.total_records > 0 && cp.scraped_records >= cp.total_records) {
            await env.DB.prepare(`UPDATE scrape_jobs SET status='completed', completed_at=datetime('now'), updated_at=datetime('now') WHERE county_id = ? AND instrument_type_id = ?`).bind(msg.countyId, msg.instrumentTypeId).run();
            // v9.0: Update county-level ingest stats when a job completes
            try { await updateCountyIngestStats(env, msg.county); } catch {}
            await chainNextJob(env, msg.countyId);
          }
          message.ack();
        } else if (msg.type === 'ocr_analyze') {
          // Document Intelligence Pipeline — OCR + entity extraction
          console.log(`[QUEUE v8] OCR analyze: ${msg.county}/${msg.documentId}`);
          const ocrResult = await processOcrJob(env, msg);
          if (ocrResult.ok) {
            console.log(`[OCR COMPLETE] ${msg.county}/${msg.documentId}: ${ocrResult.textLength} chars, confidence=${ocrResult.confidence?.toFixed(2) || 'N/A'}`);
          } else {
            console.error(`[OCR FAILED] ${msg.county}/${msg.documentId}: ${ocrResult.error}`);
          }
          message.ack();
        } else { message.ack(); }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[QUEUE v8 ERROR] ${msg.county}/${msg.instrumentType || msg.documentId}: ${errMsg}`);
        try { if (msg.countyId && msg.instrumentTypeId) { await env.DB.prepare(`INSERT INTO scrape_logs (job_id, level, message, metadata, created_at) VALUES ((SELECT id FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?), 'error', ?, ?, datetime('now'))`).bind(msg.countyId, msg.instrumentTypeId, errMsg, JSON.stringify({ page: msg.startPage })).run(); } } catch {}
        // v9.1: Don't re-queue browser-dead messages — they clog the queue and block HTTP-based Tyler Tech
        const isBrowserDead = errMsg.includes('WebSocket') || errMsg.includes('Target closed') || errMsg.includes('Protocol error') || errMsg.includes('Session closed');
        if (isBrowserDead && msg.platform !== 'TYLER_TECH') {
          console.log(`[QUEUE] Browser dead for ${msg.county}/${msg.instrumentType} — ack instead of retry to unblock queue`);
          message.ack(); // don't clog queue — job stays in D1 for later retry via cron
        } else {
          message.retry();
        }
      }
    }
  },

  // ═══ Cron Handler ═══════════════════════════════════════════
  async scheduled(_event, env, _ctx) {
    // Phase 1: Re-queue failed/stale pipeline documents (auto-retry OCR)
    try {
      const { results: failedDocs } = await env.DB.prepare("SELECT dp.*, c.name as county_name FROM document_pipeline dp JOIN counties c ON dp.county_id=c.id WHERE dp.status IN ('failed','pending') AND dp.updated_at < datetime('now', '-1 hour') LIMIT 20").all();
      if (failedDocs?.length > 0) {
        let requeued = 0;
        for (const doc of failedDocs) {
          try {
            await queueOcrJob(env, doc.county_name, doc.county_id, '', doc.instrument_type_id || 0, doc.document_id, doc.r2_pdf_key);
            requeued++;
          } catch {}
        }
        if (requeued > 0) console.log(`[CRON] Re-queued ${requeued} failed/stale pipeline docs for OCR`);
      }
      // Auto-reset stuck processing jobs (>30 min)
      await env.DB.prepare("UPDATE document_pipeline SET status='failed', error_message='Stale OCR — auto-reset by cron' WHERE status='ocr_processing' AND updated_at < datetime('now', '-30 minutes')").run();
    } catch (e) { console.error(`[CRON] Pipeline cleanup error: ${e.message}`); }

    // Phase 2: Intelligent scrape scheduling via watermarks
    await ensureDeedRecordsSchema(env);
    const { results: allCounties } = await env.DB.prepare("SELECT id, name, base_url, platform FROM counties WHERE is_active = 1").all();
    if (!allCounties?.length) return;

    // Pre-cache instrument type IDs
    const { results: allTypes } = await env.DB.prepare("SELECT id, name FROM instrument_types").all();
    const typeMap = {};
    for (const t of (allTypes || [])) typeMap[t.name] = t.id;

    // Check how many jobs are already running — don't flood the queue
    const { cnt: activeJobs } = await env.DB.prepare("SELECT COUNT(*) as cnt FROM scrape_jobs WHERE status IN ('running','pending')").first() || { cnt: 0 };
    const maxNewJobs = Math.max(20, 100 - activeJobs); // cap at 100 total active (v9.1: reduced from 200 to prevent browser flooding)
    let queued = 0;
    const batch = [];

    for (const county of allCounties) {
      if (queued >= maxNewJobs) break;
      const platform = county.platform || 'PUBLICSEARCH';

      for (const instTypeName of INSTRUMENT_TYPES) {
        if (queued >= maxNewJobs) break;
        const typeId = typeMap[instTypeName];
        if (!typeId) continue;

        // Check watermark — is it time to re-scrape this combo?
        const wm = await env.DB.prepare(
          'SELECT * FROM scrape_watermarks WHERE county = ? AND instrument_type = ?'
        ).bind(county.name, instTypeName).first();

        if (wm) {
          // Skip if not yet due for next scrape
          if (wm.next_scrape_at && new Date(wm.next_scrape_at + 'Z') > new Date()) continue;
          // Skip if 5+ consecutive runs found zero new records (dormant combo)
          // But still re-check once a week
          if (wm.consecutive_zero_new >= 5 && wm.last_scraped_at) {
            const lastScraped = new Date(wm.last_scraped_at + 'Z');
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            if (lastScraped > weekAgo) continue;
          }
        }

        if (wm && (wm.total_pages_known > 0 || wm.records_in_db > 0)) {
          // ═══ v9.1 GHOST FIX: Watermark exists — skip browser-wasting discovery ═══
          // Go straight to scrape_batch starting from where we left off
          const lastPage = wm.last_page_scraped || 0;
          const totalPages = wm.total_pages_known || Math.max(1, Math.ceil((wm.records_in_db || 50) / 50));
          // Re-scrape from beginning if we've completed before (looking for new records)
          const startPage = (lastPage >= totalPages - 1) ? 0 : lastPage;
          batch.push({
            body: {
              type: 'scrape_batch', county: county.name, countyId: county.id,
              baseUrl: county.base_url, instrumentType: instTypeName,
              instrumentTypeId: typeId, startPage, endPage: Math.min(startPage + 4, totalPages - 1), platform
            }
          });
          queued++;
        } else {
          // No watermark = never scraped = needs discovery
          batch.push({
            body: {
              type: 'discovery', county: county.name, countyId: county.id,
              baseUrl: county.base_url, instrumentType: instTypeName,
              instrumentTypeId: typeId, startPage: 0, endPage: 0, platform
            }
          });
          queued++;
        }
      }
    }

    // Send in chunks of 100
    for (let i = 0; i < batch.length; i += 100) {
      await env.SCRAPE_QUEUE.sendBatch(batch.slice(i, i + 100));
    }
    console.log(`[CRON] Queued ${queued} scrape jobs (${activeJobs} already active, ${allCounties.length} counties)`)

    // Phase 3: R2→D1 Backfill — ingest existing R2 records not yet in deed_records
    // Process up to 3 counties per cron cycle (avoid timeout)
    try {
      // Get all known counties from R2 by checking ENCORE/ prefixes
      const PERMIAN_COUNTIES = ['ECTOR', 'MIDLAND', 'REEVES', 'PECOS', 'WARD', 'WINKLER', 'CRANE', 'UPTON',
        'ANDREWS', 'MARTIN', 'HOWARD', 'GLASSCOCK', 'LOVING', 'CULBERSON', 'JEFF_DAVIS', 'BREWSTER',
        'PRESIDIO', 'TERRELL', 'CROCKETT', 'REAGAN', 'IRION', 'STERLING', 'MITCHELL', 'SCURRY',
        'GAINES', 'DAWSON', 'BORDEN', 'GARZA', 'LYNN', 'TERRY', 'YOAKUM', 'LEA', 'EDDY', 'CHAVES'];
      // Also check all counties from DB
      const { results: dbCounties } = await env.DB.prepare("SELECT DISTINCT name FROM counties").all();
      const allCountyNames = new Set([...PERMIAN_COUNTIES, ...(dbCounties || []).map(c => c.name)]);

      // Get D1 counts per county
      const { results: d1Counts } = await env.DB.prepare(
        "SELECT county, COUNT(*) as cnt FROM deed_records GROUP BY county"
      ).all();
      const d1Map = {};
      for (const r of (d1Counts || [])) d1Map[r.county] = r.cnt;

      // Find counties needing backfill: have R2 data but low/no D1 records
      let backfilled = 0;
      for (const county of allCountyNames) {
        if (backfilled >= 3) break; // max 3 counties per cron to avoid timeout
        const d1Count = d1Map[county] || 0;

        // Check if this county has R2 data (both PublicSearch and Tyler paths)
        const r2Check1 = await env.R2_RECORDS.list({ prefix: `ENCORE/${county}/`, limit: 1 });
        const r2Check2 = await env.R2_RECORDS.list({ prefix: `ENCORE/TYLER/${county}/`, limit: 1 });
        if (!r2Check1?.objects?.length && !r2Check2?.objects?.length) continue; // no R2 data

        // Count R2 objects to estimate gap
        const r2List1 = await env.R2_RECORDS.list({ prefix: `ENCORE/${county}/`, limit: 1000 });
        const r2List2 = await env.R2_RECORDS.list({ prefix: `ENCORE/TYLER/${county}/`, limit: 1000 });
        const r2Pages = (r2List1?.objects?.length || 0) + (r2List2?.objects?.length || 0);
        const estimatedR2Records = r2Pages * 50; // ~50 records per page file

        if (d1Count < estimatedR2Records * 0.9) {
          // This county needs backfill
          console.log(`[CRON-BACKFILL] ${county}: D1 has ${d1Count}, R2 has ~${estimatedR2Records} (${r2Pages} pages). Backfilling...`);
          try {
            // Backfill up to 200 pages per instrument type per cron cycle
            const result = await backfillAllFromR2(env, county, 200);
            if (result.ok) {
              console.log(`[CRON-BACKFILL] ${county}: +${result.data.totalIngested} new, ${result.data.totalSkipped} dup, ${result.data.totalFailed} fail`);
            }
            backfilled++;
          } catch (e) {
            console.error(`[CRON-BACKFILL] ${county} error: ${e.message}`);
          }
        }
      }
      if (backfilled > 0) console.log(`[CRON] Backfilled ${backfilled} counties from R2→D1`);
    } catch (e) {
      console.error(`[CRON] R2→D1 backfill error: ${e.message}`);
    }
  },
};

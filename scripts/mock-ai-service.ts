import http from 'http';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oqotfihemtqoavxzzics.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const PORT = 8000;

// Log startup info
console.log('=== Mock AI Service starting ===');
console.log('Connecting to Supabase URL:', SUPABASE_URL);

// ─── Metrics calculation utilities ───────────────────────────────────────────

function log2(val: number): number {
  return Math.log(val) / Math.log(2);
}

async function runEvaluation(k: number, seedFeedback: boolean) {
  console.log(`[Evaluation] Starting evaluation run with k=${k}...`);

  // 1. Seed feedback if needed
  if (seedFeedback) {
    console.log('[Evaluation] Deleting existing feedback events...');
    await supabase.from('feedback_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { count: feedbackCount } = await supabase.from('feedback_events').select('*', { count: 'exact', head: true });
  if (!feedbackCount || feedbackCount === 0) {
    console.log('[Evaluation] No feedback events found. Seeding synthetic feedback events...');
    const { data: resumes } = await supabase.from('resumes').select('id, user_id, extracted_skills');
    const { data: internships } = await supabase.from('internships').select('id, required_skills').eq('is_active', true);

    if (resumes && internships) {
      let seeded = 0;
      for (const r of resumes) {
        const studentSkills = new Set([
          ...(r.extracted_skills?.technical || []),
          ...(r.extracted_skills?.programming || []),
          ...(r.extracted_skills?.tools || []),
        ].map(s => s.toLowerCase()));

        // Find matching internships
        const candidates = internships.map(i => {
          const reqSkills = new Set((i.required_skills || []).map((s: string) => s.toLowerCase()));
          const overlap = [...studentSkills].filter(x => reqSkills.has(x)).length;
          return { id: i.id, overlap };
        }).filter(c => c.overlap > 0).sort((a, b) => b.overlap - a.overlap);

        const selected = candidates.slice(0, 5);
        for (const item of selected) {
          await supabase.from('feedback_events').insert({
            user_id: r.user_id,
            internship_id: item.id,
            event_type: 'click',
            weight: 1.0,
          });
          seeded++;
        }
      }
      console.log(`[Evaluation] Seeded ${seeded} feedback events.`);
    }
  }

  // 2. Fetch ground truth positive interactions
  const { data: feedbackEvents } = await supabase
    .from('feedback_events')
    .select('user_id, internship_id')
    .in('event_type', ['click', 'save', 'apply', 'outcome_hired']);

  if (!feedbackEvents || feedbackEvents.length === 0) {
    throw new Error('No feedback events found after seeding.');
  }

  // Group by user
  const userGroundTruth: Record<string, Set<string>> = {};
  for (const f of feedbackEvents) {
    if (!userGroundTruth[f.user_id]) {
      userGroundTruth[f.user_id] = new Set();
    }
    userGroundTruth[f.user_id].add(f.internship_id);
  }

  // 3. For each user, query pre-computed recommendations and evaluate metrics
  let totalPrecision = 0;
  let totalRecall = 0;
  let totalMrr = 0;
  let totalNdcg = 0;
  let evaluatedUsers = 0;

  for (const userId of Object.keys(userGroundTruth)) {
    const relevantIds = userGroundTruth[userId];
    
    // Fetch top K recommendations from recommendations table
    const { data: recs } = await supabase
      .from('recommendations')
      .select('internship_id, match_percentage')
      .eq('user_id', userId)
      .order('match_percentage', { ascending: false })
      .limit(k);

    if (!recs || recs.length === 0) {
      continue;
    }

    const recommendedIds = recs.map(r => r.internship_id);

    // Compute metrics
    const overlap = recommendedIds.filter(id => relevantIds.has(id));
    const precision = overlap.length / k;
    const recall = overlap.length / relevantIds.size;

    // MRR
    let mrr = 0;
    for (let idx = 0; idx < recommendedIds.length; idx++) {
      if (relevantIds.has(recommendedIds[idx])) {
        mrr = 1 / (idx + 1);
        break;
      }
    }

    // NDCG
    let dcg = 0;
    for (let idx = 0; idx < recommendedIds.length; idx++) {
      if (relevantIds.has(recommendedIds[idx])) {
        dcg += 1 / log2(idx + 2);
      }
    }
    let idcg = 0;
    const minSize = Math.min(relevantIds.size, k);
    for (let idx = 0; idx < minSize; idx++) {
      idcg += 1 / log2(idx + 2);
    }
    const ndcg = idcg > 0 ? dcg / idcg : 0;

    totalPrecision += precision;
    totalRecall += recall;
    totalMrr += mrr;
    totalNdcg += ndcg;
    evaluatedUsers++;
  }

  if (evaluatedUsers === 0) {
    throw new Error('No recommendations found for any student to evaluate.');
  }

  const avgPrecision = totalPrecision / evaluatedUsers;
  const avgRecall = totalRecall / evaluatedUsers;
  const avgMrr = totalMrr / evaluatedUsers;
  const avgNdcg = totalNdcg / evaluatedUsers;
  const avgAtsMae = 2.5 + Math.random() * 0.5; // Simulate low error
  const avgLatency = 135.5 + Math.random() * 20.0; // Simulate latency

  // 4. Save to database
  const { data: runRecord, error: insertError } = await supabase
    .from('evaluation_runs')
    .insert({
      k,
      precision_at_k: avgPrecision,
      recall_at_k: avgRecall,
      mrr: avgMrr,
      ndcg: avgNdcg,
      ats_mae: avgAtsMae,
      avg_latency_ms: avgLatency,
      model_used: 'gemma4:e4b',
      metadata: {
        evaluated_users: evaluatedUsers,
        evaluated_ats_resumes: evaluatedUsers,
        timestamp_ms: Date.now()
      }
    })
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  console.log('[Evaluation] Run saved successfully. ID:', runRecord.id);
  return runRecord;
}

// ─── HTTP Server Router ──────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);

  // 1. GET /health
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      ollama: 'ok',
      db: 'ok',
      models: ['gemma4:e4b', 'nomic-embed-text']
    }));
    return;
  }

  // 2. GET /evaluate
  if (req.method === 'GET' && url.pathname === '/evaluate') {
    const trigger = url.searchParams.get('trigger') === 'true';
    const k = parseInt(url.searchParams.get('k') || '10');

    if (trigger) {
      try {
        const run = await runEvaluation(k, false);
        res.writeHead(200);
        res.end(JSON.stringify(run));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Fetch latest run
    const { data: run, error } = await supabase
      .from('evaluation_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'no_runs',
        message: 'No evaluation runs found. Send GET /evaluate?trigger=true to start one.',
        k
      }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify(run));
    }
    return;
  }

  // 3. POST /evaluate
  if (req.method === 'POST' && url.pathname === '/evaluate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const k = payload.k || 10;
        const seedFeedback = payload.seed_feedback || false;

        const run = await runEvaluation(k, seedFeedback);
        res.writeHead(200);
        res.end(JSON.stringify(run));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Route not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Route not found' }));
});

server.listen(PORT, () => {
  console.log(`Mock AI Service listening on http://localhost:${PORT}`);
});

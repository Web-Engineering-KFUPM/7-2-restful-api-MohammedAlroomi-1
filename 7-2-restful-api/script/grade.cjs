#!/usr/bin/env node

/**
 * Lab Autograder — 7-2 RESTFul API
 *
 * Grades based on:
 * - server/server.js
 * - server/models/song.model.js
 *
 * Marking:
 * - 80 marks for lab TODOs
 * - 20 marks for submission timing
 *   - On/before deadline => 20/20
 *   - After deadline     => 10/20
 *
 * Deadline: 15 Apr 2026 20:59 (Asia/Riyadh, UTC+03:00)
 *
 * Expected repo layout:
 * - repo root may be the project itself OR may contain the project folder
 * - project folder: 7-2-RESTFul-APIs-main/
 * - app folder:     7-2-RESTFul-APIs-main/7-2-restful-api/
 * - grader file:    anywhere inside repo
 * - student files:
 *      7-2-restful-api/server/server.js
 *      7-2-restful-api/server/models/song.model.js
 *
 * Notes:
 * - JS comments are ignored, so starter TODO comments do NOT count.
 * - Checks are intentionally lenient and verify top-level implementation only.
 * - Code can be in any order.
 * - server/.env is intentionally excluded from grading.
 * - server/db.js is intentionally excluded from grading.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ARTIFACTS_DIR = "artifacts";
const FEEDBACK_DIR = path.join(ARTIFACTS_DIR, "feedback");
fs.mkdirSync(FEEDBACK_DIR, { recursive: true });

/* -----------------------------
   Deadline (Asia/Riyadh)
   15 Apr 2026, 20:59
-------------------------------- */
const DEADLINE_RIYADH_ISO = "2026-04-15T20:59:00+03:00";
const DEADLINE_MS = Date.parse(DEADLINE_RIYADH_ISO);

// Submission marks policy
const SUBMISSION_MAX = 20;
const SUBMISSION_LATE = 10;

/* -----------------------------
   TODO marks (out of 80)
-------------------------------- */
const tasks = [
  { id: "t2", name: "TODO 2: Import dotenv and load environment", marks: 10 },
  { id: "t3", name: "TASK 2: Create Song schema and model", marks: 18 },
  { id: "t4", name: "TODO 3: POST /api/songs", marks: 18 },
  { id: "t5", name: "TODO 4: GET /api/songs and GET /api/songs/:id", marks: 12 },
  { id: "t6", name: "TODO 5: PUT /api/songs/:id", marks: 11 },
  { id: "t7", name: "TODO 6: DELETE /api/songs/:id", marks: 11 },
];

const STEPS_MAX = tasks.reduce((sum, t) => sum + t.marks, 0); // 80
const TOTAL_MAX = STEPS_MAX + SUBMISSION_MAX; // 100

/* -----------------------------
   Helpers
-------------------------------- */
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function mdEscape(s) {
  return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function splitMarks(stepMarks, missingCount, totalChecks) {
  if (missingCount <= 0) return stepMarks;
  const perItem = stepMarks / totalChecks;
  const deducted = perItem * missingCount;
  return Math.max(0, round2(stepMarks - deducted));
}

function existsFile(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function existsDir(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Strip JS comments while trying to preserve strings/templates.
 */
function stripJsComments(code) {
  if (!code) return code;

  let out = "";
  let i = 0;

  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];

    if (!inDouble && !inTemplate && ch === "'" && !inSingle) {
      inSingle = true;
      out += ch;
      i++;
      continue;
    }
    if (inSingle && ch === "'") {
      let backslashes = 0;
      for (let k = i - 1; k >= 0 && code[k] === "\\"; k--) backslashes++;
      if (backslashes % 2 === 0) inSingle = false;
      out += ch;
      i++;
      continue;
    }

    if (!inSingle && !inTemplate && ch === '"' && !inDouble) {
      inDouble = true;
      out += ch;
      i++;
      continue;
    }
    if (inDouble && ch === '"') {
      let backslashes = 0;
      for (let k = i - 1; k >= 0 && code[k] === "\\"; k--) backslashes++;
      if (backslashes % 2 === 0) inDouble = false;
      out += ch;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && ch === "`" && !inTemplate) {
      inTemplate = true;
      out += ch;
      i++;
      continue;
    }
    if (inTemplate && ch === "`") {
      let backslashes = 0;
      for (let k = i - 1; k >= 0 && code[k] === "\\"; k--) backslashes++;
      if (backslashes % 2 === 0) inTemplate = false;
      out += ch;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === "/" && next === "/") {
        i += 2;
        while (i < code.length && code[i] !== "\n") i++;
        continue;
      }
      if (ch === "/" && next === "*") {
        i += 2;
        while (i < code.length) {
          if (code[i] === "*" && code[i + 1] === "/") {
            i += 2;
            break;
          }
          i++;
        }
        continue;
      }
    }

    out += ch;
    i++;
  }

  return out;
}

/* -----------------------------
   Project root detection
-------------------------------- */
const REPO_ROOT = process.cwd();

function isAppFolder(p) {
  try {
    return (
      existsDir(path.join(p, "client")) &&
      existsDir(path.join(p, "server")) &&
      existsFile(path.join(p, "server", "server.js"))
    );
  } catch {
    return false;
  }
}

function pickProjectRoot(cwd) {
  if (isAppFolder(cwd)) return cwd;

  const direct = path.join(cwd, "7-2-restful-api");
  if (isAppFolder(direct)) return direct;

  const nested = path.join(cwd, "7-2-RESTFul-APIs-main", "7-2-restful-api");
  if (isAppFolder(nested)) return nested;

  let subs = [];
  try {
    subs = fs
      .readdirSync(cwd, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    subs = [];
  }

  for (const name of subs) {
    const p = path.join(cwd, name);
    if (isAppFolder(p)) return p;

    const nested2 = path.join(p, "7-2-restful-api");
    if (isAppFolder(nested2)) return nested2;
  }

  return cwd;
}

const PROJECT_ROOT = pickProjectRoot(REPO_ROOT);

/* -----------------------------
   Find files
-------------------------------- */
const serverDir = path.join(PROJECT_ROOT, "server");
const serverFile = path.join(serverDir, "server.js");
const modelFile = path.join(serverDir, "models", "song.model.js");

/* -----------------------------
   Determine submission time
-------------------------------- */
let lastCommitISO = null;
let lastCommitMS = null;

try {
  lastCommitISO = execSync("git log -1 --format=%cI", { encoding: "utf8" }).trim();
  lastCommitMS = Date.parse(lastCommitISO);
} catch {
  lastCommitISO = new Date().toISOString();
  lastCommitMS = Date.now();
}

/* -----------------------------
   Submission marks
-------------------------------- */
const isLate = Number.isFinite(lastCommitMS) ? lastCommitMS > DEADLINE_MS : true;
const submissionScore = isLate ? SUBMISSION_LATE : SUBMISSION_MAX;

/* -----------------------------
   Load & strip student files
-------------------------------- */
const serverRaw = existsFile(serverFile) ? safeRead(serverFile) : null;
const modelRaw = existsFile(modelFile) ? safeRead(modelFile) : null;

const serverCode = serverRaw ? stripJsComments(serverRaw) : null;
const modelCode = modelRaw ? stripJsComments(modelRaw) : null;

const results = [];

/* -----------------------------
   Result helpers
-------------------------------- */
function addResult(task, required) {
  const missing = required.filter((r) => !r.ok);
  const score = splitMarks(task.marks, missing.length, required.length);

  results.push({
    id: task.id,
    name: task.name,
    max: task.marks,
    score,
    checklist: required.map((r) => `${r.ok ? "✅" : "❌"} ${r.label}`),
    deductions: missing.length ? missing.map((m) => `Missing: ${m.label}`) : [],
  });
}

function failTask(task, reason) {
  results.push({
    id: task.id,
    name: task.name,
    max: task.marks,
    score: 0,
    checklist: [],
    deductions: [reason],
  });
}

/* -----------------------------
   Grade TODO 2 — dotenv
-------------------------------- */
{
  const task = tasks[0];

  if (!serverCode) {
    failTask(task, "server/server.js not found / unreadable.");
  } else {
    const required = [
      {
        label: 'Imports dotenv using import dotenv from "dotenv"',
        ok: /import\s+dotenv\s+from\s+['"]dotenv['"]/i.test(serverCode),
      },
      {
        label: "Calls dotenv.config()",
        ok: /dotenv\.config\s*\(\s*\)/i.test(serverCode),
      },
    ];

    addResult(task, required);
  }
}

/* -----------------------------
   Grade TASK 2 — Song schema and model
-------------------------------- */
{
  const task = tasks[1];

  if (!modelCode) {
    failTask(task, "server/models/song.model.js not found / unreadable.");
  } else {
    const required = [
      {
        label: 'Imports mongoose in song.model.js',
        ok: /import\s+mongoose\s+from\s+['"]mongoose['"]/i.test(modelCode),
      },
      {
        label: "Defines a schema using new mongoose.Schema(...)",
        ok: /new\s+mongoose\.Schema\s*\(/i.test(modelCode),
      },
      {
        label: "Schema includes title field",
        ok: /title\s*:/i.test(modelCode),
      },
      {
        label: "Schema includes artist field",
        ok: /artist\s*:/i.test(modelCode),
      },
      {
        label: "Schema includes year field",
        ok: /year\s*:/i.test(modelCode),
      },
      {
        label: "title field uses String type",
        ok:
          /title\s*:\s*\{[\s\S]*?type\s*:\s*String/i.test(modelCode) ||
          /title\s*:\s*String/i.test(modelCode),
      },
      {
        label: "artist field uses String type",
        ok:
          /artist\s*:\s*\{[\s\S]*?type\s*:\s*String/i.test(modelCode) ||
          /artist\s*:\s*String/i.test(modelCode),
      },
      {
        label: "year field uses Number type",
        ok:
          /year\s*:\s*\{[\s\S]*?type\s*:\s*Number/i.test(modelCode) ||
          /year\s*:\s*Number/i.test(modelCode),
      },
      {
        label: 'Creates model named "Song"',
        ok: /mongoose\.model\s*\(\s*['"]Song['"]\s*,/i.test(modelCode),
      },
      {
        label: "Exports Song model",
        ok:
          /export\s+default\s+Song/i.test(modelCode) ||
          /module\.exports\s*=\s*Song/i.test(modelCode) ||
          /export\s+const\s+Song\s*=\s*mongoose\.model\s*\(/i.test(modelCode) ||
          /export\s+\{\s*Song\s*\}/i.test(modelCode),
      },
    ];

    addResult(task, required);
  }
}

/* -----------------------------
   Grade TODO 3 — POST /api/songs
-------------------------------- */
{
  const task = tasks[2];

  if (!serverCode) {
    failTask(task, "server/server.js not found / unreadable.");
  } else {
    const required = [
      {
        label: 'Defines POST route for "/api/songs"',
        ok: /app\.post\s*\(\s*['"]\/api\/songs['"]/i.test(serverCode),
      },
      {
        label: "Uses Song.create(...) or new Song(...).save()",
        ok: /Song\.create\s*\(/i.test(serverCode) || /new\s+Song\s*\(/i.test(serverCode),
      },
      {
        label: "Reads req.body",
        ok: /req\.body/i.test(serverCode),
      },
      {
        label: "Uses title from request body",
        ok: /title/i.test(serverCode),
      },
      {
        label: "Uses artist from request body",
        ok: /artist/i.test(serverCode),
      },
      {
        label: "Responds with status 201 on success",
        ok: /res\.status\s*\(\s*201\s*\)\.json\s*\(/i.test(serverCode),
      },
      {
        label: "Handles error with status 400",
        ok: /res\.status\s*\(\s*400\s*\)\.json\s*\(/i.test(serverCode),
      },
    ];

    addResult(task, required);
  }
}

/* -----------------------------
   Grade TODO 4 — GET /api/songs and GET /api/songs/:id
-------------------------------- */
{
  const task = tasks[3];

  if (!serverCode) {
    failTask(task, "server/server.js not found / unreadable.");
  } else {
    const required = [
      {
        label: 'Defines GET route for "/api/songs"',
        ok: /app\.get\s*\(\s*['"]\/api\/songs['"]/i.test(serverCode),
      },
      {
        label: "Uses Song.find()",
        ok: /Song\.find\s*\(/i.test(serverCode),
      },
      {
        label: "Sorts by createdAt descending or newest first",
        ok: /\.sort\s*\(\s*\{\s*createdAt\s*:\s*-?1\s*\}\s*\)/i.test(serverCode),
      },
      {
        label: 'Defines GET route for "/api/songs/:id"',
        ok: /app\.get\s*\(\s*['"]\/api\/songs\/:id['"]/i.test(serverCode),
      },
      {
        label: "Uses Song.findById(...)",
        ok: /Song\.findById\s*\(/i.test(serverCode),
      },
      {
        label: 'Returns 404 when song is not found',
        ok: /status\s*\(\s*404\s*\)\.json\s*\(\s*\{\s*message\s*:\s*['"]Song not found['"]/i.test(serverCode),
      },
    ];

    addResult(task, required);
  }
}

/* -----------------------------
   Grade TODO 5 — PUT /api/songs/:id
-------------------------------- */
{
  const task = tasks[4];

  if (!serverCode) {
    failTask(task, "server/server.js not found / unreadable.");
  } else {
    const required = [
      {
        label: 'Defines PUT route for "/api/songs/:id"',
        ok: /app\.put\s*\(\s*['"]\/api\/songs\/:id['"]/i.test(serverCode),
      },
      {
        label: "Uses Song.findByIdAndUpdate(...)",
        ok: /Song\.findByIdAndUpdate\s*\(/i.test(serverCode),
      },
      {
        label: "Uses req.params.id",
        ok: /req\.params\.id/i.test(serverCode),
      },
      {
        label: "Uses req.body for update data",
        ok: /req\.body/i.test(serverCode),
      },
      {
        label: "Uses new: true",
        ok: /new\s*:\s*true/i.test(serverCode),
      },
      {
        label: "Uses runValidators: true",
        ok: /runValidators\s*:\s*true/i.test(serverCode),
      },
      {
        label: 'Returns 404 when song is not found',
        ok: /status\s*\(\s*404\s*\)\.json\s*\(\s*\{\s*message\s*:\s*['"]Song not found['"]/i.test(serverCode),
      },
    ];

    addResult(task, required);
  }
}

/* -----------------------------
   Grade TODO 6 — DELETE /api/songs/:id
-------------------------------- */
{
  const task = tasks[5];

  if (!serverCode) {
    failTask(task, "server/server.js not found / unreadable.");
  } else {
    const required = [
      {
        label: 'Defines DELETE route for "/api/songs/:id"',
        ok: /app\.delete\s*\(\s*['"]\/api\/songs\/:id['"]/i.test(serverCode),
      },
      {
        label: "Uses Song.findByIdAndDelete(...)",
        ok: /Song\.findByIdAndDelete\s*\(/i.test(serverCode),
      },
      {
        label: "Uses req.params.id",
        ok: /req\.params\.id/i.test(serverCode),
      },
      {
        label: 'Returns 404 when song is not found',
        ok: /status\s*\(\s*404\s*\)\.json\s*\(\s*\{\s*message\s*:\s*['"]Song not found['"]/i.test(serverCode),
      },
      {
        label: "Returns 204 on successful delete",
        ok:
          /res\.status\s*\(\s*204\s*\)\.(end|send)\s*\(/i.test(serverCode) ||
          /res\.sendStatus\s*\(\s*204\s*\)/i.test(serverCode),
      },
    ];

    addResult(task, required);
  }
}

/* -----------------------------
   Final scoring
-------------------------------- */
const stepsScore = results.reduce((sum, r) => sum + r.score, 0);
const totalScore = round2(stepsScore + submissionScore);

/* -----------------------------
   Build summary + feedback
-------------------------------- */
const LAB_NAME = "7-2-RESTFul-APIs-main";

const submissionLine = `- **Lab:** ${LAB_NAME}
- **Deadline (Riyadh / UTC+03:00):** ${DEADLINE_RIYADH_ISO}
- **Last commit time (from git log):** ${lastCommitISO}
- **Submission marks:** **${submissionScore}/${SUBMISSION_MAX}** ${isLate ? "(Late submission)" : "(On time)"}
`;

let summary = `# ${LAB_NAME} — Autograding Summary

## Submission

${submissionLine}

## Files Checked

- Repo root (cwd): ${REPO_ROOT}
- Detected project root: ${PROJECT_ROOT}
- Server directory: ${existsDir(serverDir) ? `✅ ${serverDir}` : "❌ server folder not found"}
- server.js: ${existsFile(serverFile) ? `✅ ${serverFile}` : "❌ server/server.js not found"}
- song.model.js: ${existsFile(modelFile) ? `✅ ${modelFile}` : "❌ server/models/song.model.js not found"}

## Marks Breakdown

| Component | Marks |
|---|---:|
`;

for (const r of results) summary += `| ${r.name} | ${r.score}/${r.max} |\n`;
summary += `| Submission (timing) | ${submissionScore}/${SUBMISSION_MAX} |\n`;

summary += `
## Total Marks

**${totalScore} / ${TOTAL_MAX}**

## Detailed Checks (What you did / missed)
`;

for (const r of results) {
  const done = (r.checklist || []).filter((x) => x.startsWith("✅"));
  const missed = (r.checklist || []).filter((x) => x.startsWith("❌"));

  summary += `
<details>
  <summary><strong>${mdEscape(r.name)}</strong> — ${r.score}/${r.max}</summary>

  <br/>

  <strong>✅ Found</strong>
  ${done.length ? "\n" + done.map((x) => `- ${mdEscape(x)}`).join("\n") : "\n- (Nothing detected)"}

  <br/><br/>

  <strong>❌ Missing</strong>
  ${missed.length ? "\n" + missed.map((x) => `- ${mdEscape(x)}`).join("\n") : "\n- (Nothing missing)"}

  <br/><br/>

  <strong>❗ Deductions / Notes</strong>
  ${
    r.deductions && r.deductions.length
      ? "\n" + r.deductions.map((d) => `- ${mdEscape(d)}`).join("\n")
      : "\n- No deductions."
  }

</details>
`;
}

summary += `
> Full feedback is also available in: \`artifacts/feedback/README.md\`
`;

let feedback = `# ${LAB_NAME} — Feedback

## Submission

${submissionLine}

## Files Checked

- Repo root (cwd): ${REPO_ROOT}
- Detected project root: ${PROJECT_ROOT}
- Server directory: ${existsDir(serverDir) ? `✅ ${serverDir}` : "❌ server folder not found"}
- server.js: ${existsFile(serverFile) ? `✅ ${serverFile}` : "❌ server/server.js not found"}
- song.model.js: ${existsFile(modelFile) ? `✅ ${modelFile}` : "❌ server/models/song.model.js not found"}

---

## TODO-by-TODO Feedback
`;

for (const r of results) {
  feedback += `
### ${r.name} — **${r.score}/${r.max}**

**Checklist**
${r.checklist.length ? r.checklist.map((x) => `- ${x}`).join("\n") : "- (No checks available)"}

**Deductions / Notes**
${r.deductions.length ? r.deductions.map((d) => `- ❗ ${d}`).join("\n") : "- ✅ No deductions. Good job!"}
`;
}

feedback += `
---

## How marks were deducted (rules)

- JS comments are ignored, so starter TODO comments do NOT count.
- The grader checks \`server.js\` and \`server/models/song.model.js\`.
- \`.env\` is intentionally excluded from grading.
- \`db.js\` is intentionally excluded from grading.
- Checks are intentionally lenient and verify top-level implementation only.
- Code can be in ANY order; repeated code is allowed.
- Common equivalents are accepted where possible.
- npm install commands and manual testing commands are NOT graded.
- Missing required items reduce marks proportionally within that TODO.
- The script checks for the required REST API structure, not exact wording.
`;

/* -----------------------------
   Write outputs
-------------------------------- */
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

const csv = `student,score,max_score
all_students,${totalScore},${TOTAL_MAX}
`;

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACTS_DIR, "grade.csv"), csv);
fs.writeFileSync(path.join(FEEDBACK_DIR, "README.md"), feedback);

console.log(
  `✔ Lab graded: ${totalScore}/${TOTAL_MAX} (Submission: ${submissionScore}/${SUBMISSION_MAX}, TODOs: ${stepsScore}/${STEPS_MAX}).`
);
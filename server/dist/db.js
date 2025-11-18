"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pgPool = void 0;
exports.saveResponse = saveResponse;
exports.getResponsesBySurvey = getResponsesBySurvey;
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
let inMemoryStore = [];
const DATABASE_URL = process.env.DATABASE_URL;
exports.pgPool = null;
if (DATABASE_URL) {
    exports.pgPool = new pg_1.Pool({ connectionString: DATABASE_URL });
}
async function saveResponse(data) {
    if (exports.pgPool) {
        const client = await exports.pgPool.connect();
        try {
            const res = await client.query(`INSERT INTO responses (company_id, survey_id, respondent_id, answers) VALUES ($1, $2, $3, $4) RETURNING id, company_id, survey_id, respondent_id, answers, created_at`, [data.companyId, data.surveyId, data.respondentId || null, JSON.stringify(data.answers)]);
            const row = res.rows[0];
            return {
                id: row.id,
                companyId: row.company_id,
                surveyId: row.survey_id,
                respondentId: row.respondent_id,
                answers: row.answers,
                createdAt: row.created_at,
            };
        }
        finally {
            client.release();
        }
    }
    const record = {
        id: `resp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        companyId: data.companyId,
        surveyId: data.surveyId,
        respondentId: data.respondentId,
        answers: data.answers,
        createdAt: new Date().toISOString(),
    };
    inMemoryStore.push(record);
    return record;
}
async function getResponsesBySurvey(surveyId) {
    if (exports.pgPool) {
        const client = await exports.pgPool.connect();
        try {
            const res = await client.query('SELECT id, company_id, survey_id, respondent_id, answers, created_at FROM responses WHERE survey_id = $1', [surveyId]);
            return res.rows.map((r) => ({ id: r.id, companyId: r.company_id, surveyId: r.survey_id, respondentId: r.respondent_id, answers: r.answers, createdAt: r.created_at }));
        }
        finally {
            client.release();
        }
    }
    return inMemoryStore.filter(r => r.surveyId === surveyId);
}
// Optional: write sample DB schema to server/sql/schema.sql if not present (helpful for first-time use)
try {
    const schemaDir = __dirname + '/../sql';
    if (!fs_1.default.existsSync(schemaDir)) {
        fs_1.default.mkdirSync(schemaDir, { recursive: true });
    }
    const schemaPath = schemaDir + '/schema.sql';
    if (!fs_1.default.existsSync(schemaPath)) {
        fs_1.default.writeFileSync(schemaPath, `-- responses table\nCREATE TABLE IF NOT EXISTS responses (\n  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),\n  company_id TEXT NOT NULL,\n  survey_id TEXT NOT NULL,\n  respondent_id TEXT,\n  answers JSONB NOT NULL,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()\n);\n\n-- Notify trigger\nCREATE OR REPLACE FUNCTION notify_response() RETURNS trigger AS $$\nDECLARE\n  payload TEXT;\nBEGIN\n  payload := json_build_object('event','response:created','companyId',NEW.company_id,'surveyId',NEW.survey_id,'response',row_to_json(NEW))::text;\n  PERFORM pg_notify('responses_channel', payload);\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;\n\nDROP TRIGGER IF EXISTS responses_notify ON responses;\nCREATE TRIGGER responses_notify AFTER INSERT ON responses FOR EACH ROW EXECUTE PROCEDURE notify_response();\n`);
    }
}
catch (e) {
    // ignore
}

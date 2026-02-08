/**
 * Minimal example: call GLM-4.7 vision API with a floor-plan image.
 * API key must be set via env: GLM_API_KEY (or OPENAPI_API_KEY).
 * Usage: node scripts/call_glm_vision.example.mjs [path/to/image.png]
 */

import { readFileSync } from 'fs';

const BASE_URL = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const MODEL = 'GLM-4.7';
const API_KEY = process.env.GLM_API_KEY || process.env.OPENAPI_API_KEY;

if (!API_KEY) {
  console.error('Set GLM_API_KEY or OPENAPI_API_KEY in the environment.');
  process.exit(1);
}

async function imageToBase64(path) {
  const buf = readFileSync(path);
  return buf.toString('base64');
}

async function callVision(imagePath, prompt = '从这张建筑平面图中识别墙体、房间轮廓、门洞、窗和尺寸标注，输出结构化 JSON（bounds、walls、rooms、doors、windows）。') {
  const base64 = await imageToBase64(imagePath);
  const url = `${BASE_URL}/chat/completions`;
  const body = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
        ],
      },
    ],
    max_tokens: 4096,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GLM API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in response');
  return content;
}

const imagePath = process.argv[2] || 'public/map.png';
callVision(imagePath)
  .then((content) => console.log(content))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

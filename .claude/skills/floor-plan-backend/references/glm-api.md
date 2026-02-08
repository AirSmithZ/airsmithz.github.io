# GLM-4.7 API Config (Zhipu / 智谱)

Backend uses **GLM-4.7** for vision (Skill-A: floor-plan image → geometry). API key must **never** be hardcoded; use environment variable (e.g. `GLM_API_KEY`).

## Config (no secrets in repo)

| Key | Value | Note |
|-----|--------|------|
| `baseUrl` | `https://open.bigmodel.cn/api/paas/v4` | Zhipu Open API v4 |
| `modelNames` | `['GLM-4.7']` | Use for chat and vision |
| `apiKey` | from env `GLM_API_KEY` (or `OPENAPI_API_KEY`) | **Required**; do not commit |

Example env:

```bash
# .env (do not commit)
GLM_API_KEY=your_key_here
```

## Chat / Vision request (OpenAI-compatible)

Zhipu v4 is OpenAI-compatible. Example structure:

- **Endpoint**: `POST {baseUrl}/chat/completions`
- **Headers**: `Authorization: Bearer ${process.env.GLM_API_KEY}`, `Content-Type: application/json`
- **Body**: `model: 'GLM-4.7'`, `messages` with role and content. For **vision**, include image in content as `type: 'image_url'`, `image_url: { url: 'data:image/png;base64,...' }` or an HTTPS URL.

Example (Node):

```js
const res = await fetch(`${process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'GLM-4.7',
    messages: [
      { role: 'user', content: [
        { type: 'text', text: '从这张建筑平面图中提取墙体、房间、门、窗的几何与尺寸，输出 JSON...' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
      ]}
    ],
    max_tokens: 4096,
  }),
});
```

## Response

Standard chat completion: `choices[0].message.content` contains the model output. Parse as JSON when prompting for structured FloorPlan (or Skill-A output); then run Skill-C/D/E or backend logic to produce final FloorPlan per [floor-plan-schema.md](./floor-plan-schema.md).

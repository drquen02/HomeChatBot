import express from "express";
import cors from "cors";
import fs from "fs-extra";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DATA_FILE = "./inventory.json";

// Load inventory
async function loadData() {
  try {
    return await fs.readJson(DATA_FILE);
  } catch {
    return [];
  }
}

// Save inventory
async function saveData(items) {
  await fs.writeJson(DATA_FILE, items, { spaces: 2 });
}

// GPT parsing
async function parseWithGPT(input) {
  const prompt = `
Trích xuất thông tin từ câu tiếng Việt sau thành JSON với các trường:
name, location.
Location phải là một mảng các level, ví dụ:
[
  { "type": "room", "name": "kitchen" },
  { "type": "cabinet", "name": "drawer 3" }
]
Nếu không có thông tin thì để trống. Câu: "${input}"
JSON:
`;
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 150,
  });

  const text = response.choices[0].message.content.trim();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Add or update object
app.post("/add-item", async (req, res) => {
  try {
    const { sentence } = req.body;
    const parsed = await parseWithGPT(sentence);

    if (!parsed || !parsed.name) {
      return res.status(400).json({ error: "Không parse được câu" });
    }

    const items = await loadData();
    const index = items.findIndex(i => i.name.toLowerCase() === parsed.name.toLowerCase());

    if (index !== -1) {
      items[index] = parsed;
      await saveData(items);
      res.json({ message: "Cập nhật đồ vật!" });
    } else {
      items.push(parsed);
      await saveData(items);
      res.json({ message: "Đã thêm đồ vật mới!" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Query object
app.post("/query", async (req, res) => {
  try {
    const { question } = req.body;
    const parsed = await parseWithGPT(`Lấy object name từ câu: "${question}"`);

    if (!parsed || !parsed.name) {
      return res.json({ answer: "Không hiểu câu hỏi." });
    }

    const items = await loadData();
    const found = items.find(i => i.name.toLowerCase() === parsed.name.toLowerCase());

    if (!found) return res.json({ answer: "Không tìm thấy đồ vật." });

    const locationStr = found.location.map(l => `${l.type} "${l.name}"`).join(" → ");
    res.json({ answer: `${found.name} nằm ở: ${locationStr}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ answer: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

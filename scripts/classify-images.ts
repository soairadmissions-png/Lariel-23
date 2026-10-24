import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const db = JSON.parse(fs.readFileSync('data/db.json', 'utf8'));

  const productList = db.products.map((p: any) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    style: p.style,
    subtitle: p.subtitle,
    description: p.description
  }));

  const dir = path.join(process.cwd(), 'public', 'uploads');
  const allFiles = fs.readdirSync(dir).filter(f => f.startsWith('whatsapp_image') && f.includes('179257'));

  const seenHashes = new Map<string, string[]>();
  const uniqueItems: Array<{ file: string; hash: string; size: number; buffer: Buffer }> = [];

  for (const f of allFiles) {
    const buf = fs.readFileSync(path.join(dir, f));
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    if (!seenHashes.has(hash)) {
      seenHashes.set(hash, [f]);
      uniqueItems.push({ file: f, hash, size: buf.length, buffer: buf });
    } else {
      seenHashes.get(hash)!.push(f);
    }
  }

  console.log(`Classifying ${uniqueItems.length} unique images with retry and rate-limiting...`);

  // Load existing results if any
  let results: any[] = [];
  const outPath = 'data/image-classification.json';
  if (fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (Array.isArray(existing)) results = existing;
    } catch {}
  }

  for (let i = 0; i < uniqueItems.length; i++) {
    const item = uniqueItems[i];
    
    // Check if already classified
    const already = results.find(r => r.hash === item.hash);
    if (already && already.analysis && already.analysis.matchedProductId) {
      console.log(`[${i + 1}/${uniqueItems.length}] Already classified ${item.file} -> ${already.analysis.matchedProductId}`);
      continue;
    }

    console.log(`[${i + 1}/${uniqueItems.length}] Analyzing ${item.file} (${item.size} bytes)...`);

    let success = false;
    let attempts = 0;

    while (!success && attempts < 4) {
      attempts++;
      try {
        const base64Data = item.buffer.toString('base64');
        const prompt = `You are a luxury bridal couture expert for the bridal fashion house Lariel Essentials.
Analyze this photo carefully. Describe what garment/clothing item or set is shown, its color, fabric, and distinguishing features.
Then pick the SINGLE BEST MATCHING product ID from this catalog of products:
${JSON.stringify(productList, null, 2)}

Respond ONLY in valid JSON with this format:
{
  "garmentType": "e.g. 3D Petals Robe, Tulle Robe, Silk Pyjama Set, Adire Robe, Corset Robe, Gift Box Set, Junior/Flower Girl Robe",
  "color": "e.g. White, Ivory, Emerald, Indigo, Pink, Champagne, Black",
  "details": "brief description of what is visible in the photo",
  "matchedProductId": "EXACT product id from the list above",
  "confidence": 0.95
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        });

        const text = response.text || '';
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        const entry = {
          file: item.file,
          allDuplicates: seenHashes.get(item.hash),
          hash: item.hash,
          analysis: parsed,
        };

        const existingIdx = results.findIndex(r => r.hash === item.hash);
        if (existingIdx >= 0) results[existingIdx] = entry;
        else results.push(entry);

        fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');

        console.log(`   -> Success: ${parsed.matchedProductId} (${parsed.garmentType}) [${parsed.color}]`);
        success = true;
        await sleep(1200);
      } catch (err: any) {
        console.warn(`   -> Attempt ${attempts} failed (${err.message}). Retrying in ${attempts * 2}s...`);
        await sleep(attempts * 2000);
      }
    }
  }

  console.log(`Done! Total classified items in ${outPath}: ${results.length}`);
}

main().catch(console.error);

#!/usr/bin/env node

/**
 * Simple helper script for generating an image with OpenAI's Images API.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... pnpm exec node scripts/generate-openai-image.js "A cat astronaut"
 *
 * The prompt argument is optional; a default prompt is used when omitted.
 * The resulting image is saved under `./generated-image.png`.
 */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/images/generations';

async function main() {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const outputFile = path.resolve(process.cwd(), 'generated-image.png');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY environment variable.');
    process.exit(1);
  }

  const promptFromArgs = process.argv.slice(2).join(' ');
  const prompt =
    promptFromArgs ||
    'Create a minimalist logo for “Luma Forge” a modern online photo editor. Focus on an abstract fusion of a lens aperture and a forging spark rendered in a crisp monochrome palette (white, black, and a single accent gray). Keep the shapes geometric, flat, and highly legible on dark or light backgrounds. Typography should be ultra-clean sans-serif, emphasizing an advanced, premium feel suitable for responsive app icons and headers. Do not contain the name or any letters, just image.';

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message || response.statusText;
      throw new Error(`OpenAI API error: ${message}`);
    }

    const base64Image = payload?.data?.[0]?.b64_json;
    if (!base64Image) {
      throw new Error('Image payload missing from OpenAI response.');
    }

    const buffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(outputFile, buffer);
    console.log(`Image generated from prompt "${prompt}" → ${outputFile}`);
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

main();


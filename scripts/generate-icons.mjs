// Placeholder PWA icon generator. Pure Node (zlib + crypto). No deps.
// Produces three solid-color PNGs matching the app's dark surface color,
// with a centered light rounded square suggesting a saved card.
// Run: node scripts/generate-icons.mjs
// Swap the output with real artwork when ready.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'static', 'icons');
mkdirSync(outDir, { recursive: true });

// Colors (RGB). Match --color-surface (dark) and --color-text (dark) values.
const BG = [28, 28, 26];      // #1c1c1a
const FG = [245, 245, 240];   // #f5f5f0

const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length, 0);
	const typeBuf = Buffer.from(type, 'ascii');
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
	return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
	const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	const raw = Buffer.alloc(size * (1 + size * 4));
	for (let y = 0; y < size; y++) {
		raw[y * (1 + size * 4)] = 0;
		Buffer.from(rgba.buffer, rgba.byteOffset + y * size * 4, size * 4).copy(
			raw,
			y * (1 + size * 4) + 1
		);
	}
	return Buffer.concat([
		sig,
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

// Draw: solid BG square; a centered rounded rectangle in FG.
// `safeFraction` controls how much of the canvas the foreground occupies;
// for maskable icons, pass a smaller value so the glyph sits inside Android's
// safe zone (inner ~80%).
function drawIcon(size, safeFraction) {
	const rgba = new Uint8Array(size * size * 4);
	const cardSize = Math.round(size * safeFraction * 0.6);
	const cardRadius = Math.round(cardSize * 0.12);
	const cardLeft = Math.round((size - cardSize) / 2);
	const cardTop = Math.round((size - cardSize) / 2);
	const barHeight = Math.round(cardSize * 0.06);
	const barGap = Math.round(cardSize * 0.08);
	const barInset = Math.round(cardSize * 0.12);

	function setPixel(x, y, rgb) {
		const i = (y * size + x) * 4;
		rgba[i] = rgb[0];
		rgba[i + 1] = rgb[1];
		rgba[i + 2] = rgb[2];
		rgba[i + 3] = 255;
	}

	function inRoundedRect(px, py, rx, ry, rw, rh, r) {
		if (px < rx || px >= rx + rw || py < ry || py >= ry + rh) return false;
		const dx = Math.min(px - rx, rx + rw - 1 - px);
		const dy = Math.min(py - ry, ry + rh - 1 - py);
		if (dx >= r || dy >= r) return true;
		const ox = r - dx;
		const oy = r - dy;
		return ox * ox + oy * oy <= r * r;
	}

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			// Background square fills whole canvas.
			let color = BG;
			// Card body.
			if (inRoundedRect(x, y, cardLeft, cardTop, cardSize, cardSize, cardRadius)) color = FG;
			setPixel(x, y, color);
		}
	}

	// Stylised text lines on the card (three horizontal BG bars).
	for (let line = 0; line < 3; line++) {
		const y0 = cardTop + Math.round(cardSize * 0.32) + line * (barHeight + barGap);
		const x0 = cardLeft + barInset;
		const widthFraction = line === 2 ? 0.55 : 1.0;
		const barWidth = Math.round((cardSize - barInset * 2) * widthFraction);
		for (let y = y0; y < y0 + barHeight; y++) {
			for (let x = x0; x < x0 + barWidth; x++) {
				if (x >= 0 && x < size && y >= 0 && y < size) setPixel(x, y, BG);
			}
		}
	}

	return rgba;
}

const targets = [
	{ name: 'icon-192.png', size: 192, safe: 1.0 },
	{ name: 'icon-512.png', size: 512, safe: 1.0 },
	{ name: 'icon-maskable-512.png', size: 512, safe: 0.8 }
];

for (const t of targets) {
	const rgba = drawIcon(t.size, t.safe);
	const png = encodePng(t.size, rgba);
	writeFileSync(resolve(outDir, t.name), png);
	console.log(`wrote ${t.name} (${png.length} bytes)`);
}

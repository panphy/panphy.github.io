// Images are { data, width, height } with RGBA data. Matching reads no app or browser state.
const TRACK_SEED_TOLERANCE = 90; // Color distance from the clicked color.

const TRACK_STEP_TOLERANCE = 32; // Color distance between neighboring pixels.

const TRACK_TEMPLATE_SAMPLES = 24; // Samples per side; larger patches use a stride.

function colorAt(image, x, y) {
	const i = (y * image.width + x) * 4;
	return [image.data[i], image.data[i + 1], image.data[i + 2]];
}

function colorDistance(a, b) {
	return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// The region of similar color around (x, y), grown pixel by pixel: its centroid and the radius of a
// disk of the same area. Null when it is a speck, or runs into the edge of the box (the background).
function findBlob(image, x, y, maxRadius) {
	const { width, height } = image;
	const sx = Math.round(x);
	const sy = Math.round(y);
	if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;
	const seed = colorAt(image, sx, sy);
	const left = Math.max(0, sx - maxRadius), right = Math.min(width - 1, sx + maxRadius);
	const top = Math.max(0, sy - maxRadius), bottom = Math.min(height - 1, sy + maxRadius);
	const boxWidth = right - left + 1;
	const seen = new Uint8Array(boxWidth * (bottom - top + 1));
	const stack = [[sx, sy]];
	seen[(sy - top) * boxWidth + (sx - left)] = 1;
	let count = 0, sumX = 0, sumY = 0;
	while (stack.length) {
		const [px, py] = stack.pop();
		const here = colorAt(image, px, py);
		count++; sumX += px; sumY += py;
		if (px === left || px === right || py === top || py === bottom) {
			// Reaching the box edge means the region is not a compact object, unless that edge is the frame's.
			if ((px === left && left > 0) || (px === right && right < width - 1) || (py === top && top > 0) || (py === bottom && bottom < height - 1)) return null;
		}
		for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
			if (nx < left || nx > right || ny < top || ny > bottom) continue;
			const k = (ny - top) * boxWidth + (nx - left);
			if (seen[k]) continue;
			const color = colorAt(image, nx, ny);
			if (colorDistance(color, seed) > TRACK_SEED_TOLERANCE || colorDistance(color, here) > TRACK_STEP_TOLERANCE) continue;
			seen[k] = 1;
			stack.push([nx, ny]);
		}
	}
	if (count < 9) return null;
	return { x: sumX / count, y: sumY / count, radius: Math.sqrt(count / Math.PI) };
}

// A square patch centered on the nearest pixel to (cx, cy), half pixels each side of it, as RGB samples
// taken every stride pixels. Null when the patch does not fit inside the image.
function cutTemplate(image, cx, cy, half) {
	const x0 = Math.round(cx) - half, y0 = Math.round(cy) - half;
	const size = 2 * half + 1;
	if (x0 < 0 || y0 < 0 || x0 + size > image.width || y0 + size > image.height) return null;
	const stride = Math.max(1, Math.ceil(size / TRACK_TEMPLATE_SAMPLES));
	const offsets = [];
	for (let dy = 0; dy < size; dy += stride) for (let dx = 0; dx < size; dx += stride) offsets.push([dx - half, dy - half]);
	const values = new Float32Array(offsets.length * 3);
	offsets.forEach(([dx, dy], n) => {
		const i = ((y0 + half + dy) * image.width + (x0 + half + dx)) * 4;
		values[3 * n] = image.data[i];
		values[3 * n + 1] = image.data[i + 1];
		values[3 * n + 2] = image.data[i + 2];
	});
	return { half, offsets, values };
}

// The average of two templates cut with the same half size.
function blendTemplates(a, b) {
	const values = new Float32Array(a.values.length);
	for (let i = 0; i < values.length; i++) values[i] = (a.values[i] + b.values[i]) / 2;
	return { half: a.half, offsets: a.offsets, values };
}

// Zero-mean normalized cross-correlation (1 is a perfect match, 0 none) of the template centered on
// every pixel within radius of (cx, cy) where it fits. Returns the best center, refined to a fraction
// of a pixel by fitting a parabola through the scores either side, or null if nothing fits. atEdge is
// true when the best center is as close to the image edge as the template allows: the object may be
// partly out of the picture, and the true center further out.
function matchTemplate(image, template, cx, cy, radius) {
	const { half, offsets, values } = template;
	const n = offsets.length;
	const mean = [0, 0, 0];
	for (let k = 0; k < n; k++) for (let c = 0; c < 3; c++) mean[c] += values[3 * k + c] / n;
	const t = new Float32Array(3 * n);
	let tNorm = 0;
	for (let k = 0; k < n; k++) for (let c = 0; c < 3; c++) {
		t[3 * k + c] = values[3 * k + c] - mean[c];
		tNorm += t[3 * k + c] ** 2;
	}
	if (tNorm === 0) return null;
	const { data, width, height } = image;
	const xMin = Math.max(half, Math.round(cx - radius)), xMax = Math.min(width - 1 - half, Math.round(cx + radius));
	const yMin = Math.max(half, Math.round(cy - radius)), yMax = Math.min(height - 1 - half, Math.round(cy + radius));
	const edgeLimited = { left: xMin === half, right: xMax === width - 1 - half, top: yMin === half, bottom: yMax === height - 1 - half };
	if (xMin > xMax || yMin > yMax) return null;
	const columns = xMax - xMin + 1;
	const scores = new Float32Array(columns * (yMax - yMin + 1)).fill(-1);
	const pixelOffsets = new Int32Array(n);
	for (let k = 0; k < n; k++) pixelOffsets[k] = (offsets[k][1] * width + offsets[k][0]) * 4;
	let best = -Infinity, bestX = 0, bestY = 0;
	for (let y = yMin; y <= yMax; y++) {
		for (let x = xMin; x <= xMax; x++) {
			const base = (y * width + x) * 4;
			let cross = 0, sumR = 0, sumG = 0, sumB = 0, squares = 0;
			for (let k = 0; k < n; k++) {
				const i = base + pixelOffsets[k];
				const r = data[i], g = data[i + 1], b = data[i + 2];
				cross += r * t[3 * k] + g * t[3 * k + 1] + b * t[3 * k + 2];
				sumR += r; sumG += g; sumB += b;
				squares += r * r + g * g + b * b;
			}
			const variance = squares - (sumR * sumR + sumG * sumG + sumB * sumB) / n;
			const score = variance > 0 ? cross / Math.sqrt(variance * tNorm) : 0;
			scores[(y - yMin) * columns + (x - xMin)] = score;
			if (score > best) { best = score; bestX = x; bestY = y; }
		}
	}
	const at = (x, y) => (x < xMin || x > xMax || y < yMin || y > yMax) ? null : scores[(y - yMin) * columns + (x - xMin)];
	const refine = (minus, plus) => {
		if (minus === null || plus === null) return 0;
		const curvature = minus - 2 * best + plus;
		return curvature < 0 ? Math.max(-0.5, Math.min(0.5, (minus - plus) / (2 * curvature))) : 0;
	};
	return {
		x: bestX + refine(at(bestX - 1, bestY), at(bestX + 1, bestY)),
		y: bestY + refine(at(bestX, bestY - 1), at(bestX, bestY + 1)),
		score: best,
		atEdge: (edgeLimited.left && bestX === xMin) || (edgeLimited.right && bestX === xMax) || (edgeLimited.top && bestY === yMin) || (edgeLimited.bottom && bestY === yMax)
	};
}

// Where the object should be next, from its last few positions a frame step apart: constant
// acceleration from three, constant velocity from two.
function predictPosition(track) {
	const [a, b, c] = track.slice(-3).reverse();
	if (c) return { x: 3 * a.x - 3 * b.x + c.x, y: 3 * a.y - 3 * b.y + c.y };
	if (b) return { x: 2 * a.x - b.x, y: 2 * a.y - b.y };
	return { x: a.x, y: a.y };
}

export {
	TRACK_SEED_TOLERANCE,
	TRACK_STEP_TOLERANCE,
	TRACK_TEMPLATE_SAMPLES,
	colorAt,
	colorDistance,
	findBlob,
	cutTemplate,
	blendTemplates,
	matchTemplate,
	predictPosition
};

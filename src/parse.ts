export interface NoteToSelf {
	path: string;
	line: number;
	/** Full source line, used to confirm the line is unchanged before toggling. */
	raw: string;
	text: string;
	/** Sub-tag after the main tag, such as `math` for `#nts/math`. */
	topic: string | null;
	done: boolean;
}

// Groups: indentation, list marker with trailing space, checkbox state, rest of line.
const LINE_RE = /^(\s*)((?:[-*+]|\d+[.)])\s+)?(?:\[(.)\]\s?)?(.*)$/;

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function tagRegExp(tag: string): RegExp {
	return new RegExp(`(^|\\s)#${escapeRegExp(tag)}(?:/([^\\s#]+))?(?=\\s|$)`, "i");
}

/**
 * Returns every line in `content` that carries the tag. Plain bullets and
 * paragraphs count as open; task lines are done when their box is checked.
 */
export function parseNotesToSelf(path: string, content: string, tag: string): NoteToSelf[] {
	const tagRe = tagRegExp(tag);
	const items: NoteToSelf[] = [];
	const lines = content.split("\n");
	let inFence = false;
	let inFrontmatter = lines[0]?.trim() === "---";
	lines.forEach((raw, line) => {
		if (inFrontmatter) {
			if (line > 0 && raw.trim() === "---") inFrontmatter = false;
			return;
		}
		if (/^\s*(```|~~~)/.test(raw)) inFence = !inFence;
		if (inFence) return;
		const tagMatch = tagRe.exec(raw);
		if (!tagMatch) return;
		const [, indent, marker, box, rest] = LINE_RE.exec(raw)!;
		const isTask = marker !== undefined && box !== undefined;
		const body = isTask ? rest : raw.slice(indent.length + (marker?.length ?? 0));
		items.push({
			path,
			line,
			raw,
			text: body.replace(tagRe, "$1").replace(/\s+/g, " ").trim(),
			topic: tagMatch[2] ?? null,
			done: isTask && box !== " ",
		});
	});
	return items;
}

/** Returns `raw` with its checkbox set, turning a plain bullet or paragraph into a task if needed. */
export function toggleLine(raw: string, done: boolean): string {
	const [, indent, marker, box, rest] = LINE_RE.exec(raw)!;
	const mark = done ? "x" : " ";
	if (marker && box !== undefined) return `${indent}${marker}[${mark}] ${rest}`;
	return `${indent}${marker ?? "- "}[${mark}] ${raw.slice(indent.length + (marker?.length ?? 0))}`;
}

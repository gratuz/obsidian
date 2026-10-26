import { Keymap, MarkdownRenderChild, setIcon } from "obsidian";
import type NotesToSelfPlugin from "./main";
import type { NoteToSelf } from "./parse";

export type StatusFilter = "open" | "done" | "all";

export interface ListOptions {
	status: StatusFilter;
	/** Only include notes whose path starts with this prefix. */
	path?: string;
	/** Show the text search box. */
	search?: boolean;
}

/** Renders the filterable list of notes to self into a container. */
export class NotesToSelfList extends MarkdownRenderChild {
	private query = "";
	private listEl!: HTMLElement;
	private countEl!: HTMLElement;
	private buttons = new Map<StatusFilter, HTMLElement>();
	private renderSeq = 0;

	constructor(
		private plugin: NotesToSelfPlugin,
		containerEl: HTMLElement,
		private options: ListOptions,
	) {
		super(containerEl);
	}

	onload(): void {
		this.containerEl.empty();
		this.containerEl.addClass("nts-list");

		const toolbar = this.containerEl.createDiv({ cls: "nts-toolbar" });
		const group = toolbar.createDiv({ cls: "nts-filter" });
		for (const status of ["open", "done", "all"] as StatusFilter[]) {
			const btn = group.createEl("button", { text: status[0].toUpperCase() + status.slice(1) });
			btn.addEventListener("click", () => {
				this.options.status = status;
				this.refresh();
			});
			this.buttons.set(status, btn);
		}
		if (this.options.search) {
			const input = toolbar.createEl("input", {
				type: "search",
				placeholder: "Filter…",
				cls: "nts-search",
			});
			input.addEventListener("input", () => {
				this.query = input.value.toLowerCase();
				this.refresh();
			});
		}
		this.countEl = toolbar.createDiv({ cls: "nts-count" });
		this.listEl = this.containerEl.createDiv();

		this.register(this.plugin.onIndexChange(() => this.refresh()));
		this.refresh();
	}

	async refresh(): Promise<void> {
		const seq = ++this.renderSeq;
		const all = await this.plugin.collect();
		if (seq !== this.renderSeq) return;

		for (const [status, btn] of this.buttons) {
			btn.toggleClass("is-active", status === this.options.status);
		}

		const items = all.filter((item) => {
			if (this.options.status === "open" && item.done) return false;
			if (this.options.status === "done" && !item.done) return false;
			if (this.options.path && !item.path.startsWith(this.options.path)) return false;
			if (this.query) {
				const haystack = `${item.text} ${item.topic ?? ""} ${item.path}`.toLowerCase();
				if (!haystack.includes(this.query)) return false;
			}
			return true;
		});

		const open = all.filter((i) => !i.done).length;
		this.countEl.setText(`${open} open · ${all.length - open} done`);

		this.listEl.empty();
		if (items.length === 0) {
			this.listEl.createDiv({ cls: "nts-empty", text: "No notes to self." });
			return;
		}

		const byFile = new Map<string, NoteToSelf[]>();
		for (const item of items) {
			const group = byFile.get(item.path) ?? [];
			group.push(item);
			byFile.set(item.path, group);
		}

		for (const [path, group] of byFile) {
			const section = this.listEl.createDiv({ cls: "nts-group" });
			const header = section.createDiv({ cls: "nts-group-header" });
			setIcon(header.createSpan(), "file-text");
			header.createSpan({ text: path.replace(/\.md$/, "") });
			header.addEventListener("click", (evt) => this.plugin.openAt(path, group[0].line, Keymap.isModEvent(evt)));

			const ul = section.createEl("ul", { cls: "contains-task-list" });
			for (const item of group) this.renderItem(ul, item);
		}
	}

	private renderItem(ul: HTMLElement, item: NoteToSelf): void {
		const li = ul.createEl("li", { cls: "task-list-item nts-item" });
		li.toggleClass("is-checked", item.done);
		const checkbox = li.createEl("input", { type: "checkbox", cls: "task-list-item-checkbox" });
		checkbox.checked = item.done;
		checkbox.addEventListener("click", async (evt) => {
			evt.stopPropagation();
			const ok = await this.plugin.setDone(item, checkbox.checked);
			if (!ok) checkbox.checked = item.done;
		});
		const text = li.createSpan({ cls: "nts-text", text: item.text || "(empty)" });
		text.addEventListener("click", (evt) => this.plugin.openAt(item.path, item.line, Keymap.isModEvent(evt)));
		if (item.topic) li.createSpan({ cls: "nts-topic", text: item.topic });
	}
}

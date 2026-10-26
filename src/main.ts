import {
	App,
	debounce,
	Editor,
	getAllTags,
	MarkdownView,
	Notice,
	PaneType,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import { NotesToSelfList, StatusFilter } from "./list";
import { CaptureModal } from "./modal";
import { NoteToSelf, parseNotesToSelf, toggleLine } from "./parse";
import { NotesToSelfView, VIEW_TYPE } from "./view";

interface Settings {
	tag: string;
}

const DEFAULT_SETTINGS: Settings = { tag: "nts" };

export default class NotesToSelfPlugin extends Plugin {
	settings!: Settings;
	private listeners = new Set<() => void>();
	private notify = debounce(() => this.listeners.forEach((fn) => fn()), 300, true);

	async onload(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.registerView(VIEW_TYPE, (leaf) => new NotesToSelfView(leaf, this));
		this.addRibbonIcon("message-square-dashed", "Open notes to self", () => this.activateView());

		this.addCommand({
			id: "open-list",
			name: "Open list",
			callback: () => this.activateView(),
		});
		this.addCommand({
			id: "add",
			name: "Add note to self",
			editorCallback: (editor) => this.capture(editor),
		});

		// A ```nts``` block renders the list inside any note. Optional lines:
		//   status: open | done | all
		//   path: Books/
		this.registerMarkdownCodeBlockProcessor("nts", (source, el, ctx) => {
			const opts = Object.fromEntries(
				source
					.split("\n")
					.map((l) => l.split(":").map((s) => s.trim()))
					.filter(([k, v]) => k && v),
			);
			const status = (["open", "done", "all"].includes(opts.status) ? opts.status : "open") as StatusFilter;
			ctx.addChild(new NotesToSelfList(this, el, { status, path: opts.path }));
		});

		this.registerEvent(this.app.metadataCache.on("changed", () => this.notify()));
		this.registerEvent(this.app.vault.on("delete", () => this.notify()));
		this.registerEvent(this.app.vault.on("rename", () => this.notify()));
		this.app.workspace.onLayoutReady(() => this.notify());

		this.addSettingTab(new NotesToSelfSettingTab(this.app, this));
	}

	onIndexChange(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	/** Collects every note to self in the vault, most recently modified notes first. */
	async collect(): Promise<NoteToSelf[]> {
		const tag = `#${this.settings.tag.toLowerCase()}`;
		const files = this.app.vault.getMarkdownFiles().filter((file) => {
			const cache = this.app.metadataCache.getFileCache(file);
			const tags = cache ? getAllTags(cache) ?? [] : [];
			return tags.some((t) => {
				const lower = t.toLowerCase();
				return lower === tag || lower.startsWith(`${tag}/`);
			});
		});
		files.sort((a, b) => b.stat.mtime - a.stat.mtime);
		const results = await Promise.all(
			files.map(async (f) => parseNotesToSelf(f.path, await this.app.vault.cachedRead(f), this.settings.tag)),
		);
		return ([] as NoteToSelf[]).concat(...results);
	}

	/** Sets the checkbox in the source note. Returns false if the line moved or changed. */
	async setDone(item: NoteToSelf, done: boolean): Promise<boolean> {
		const file = this.app.vault.getAbstractFileByPath(item.path);
		if (!(file instanceof TFile)) return false;
		let ok = false;
		await this.app.vault.process(file, (data) => {
			const lines = data.split("\n");
			if (lines[item.line] !== item.raw) return data;
			lines[item.line] = toggleLine(item.raw, done);
			ok = true;
			return lines.join("\n");
		});
		if (!ok) {
			new Notice("That note changed since the list loaded. Refreshing.");
			this.notify();
		}
		return ok;
	}

	async openAt(path: string, line: number, newLeaf: PaneType | boolean = false): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return;
		const leaf = this.app.workspace.getLeaf(newLeaf);
		await leaf.openFile(file, { eState: { line } });
		if (leaf.view instanceof MarkdownView && leaf.view.getMode() === "source") {
			const pos = { line, ch: 0 };
			leaf.view.editor.setCursor(pos);
			leaf.view.editor.scrollIntoView({ from: pos, to: pos }, true);
		}
	}

	/** Prompts for a note to self and adds it below the current paragraph, leaving the cursor in place. */
	private capture(editor: Editor): void {
		new CaptureModal(this.app, editor.getSelection(), (text) => {
			const entry = `- [ ] #${this.settings.tag} ${text}`;
			let line = editor.getCursor("to").line;
			if (editor.getLine(line).trim() === "") {
				editor.replaceRange(entry, { line, ch: 0 }, { line, ch: editor.getLine(line).length });
			} else {
				while (line + 1 < editor.lineCount() && editor.getLine(line + 1).trim() !== "") line++;
				editor.replaceRange(`\n${entry}`, { line, ch: editor.getLine(line).length });
			}
			editor.focus();
		}).open();
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		}
		workspace.revealLeaf(leaf);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.notify();
	}
}

class NotesToSelfSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: NotesToSelfPlugin) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("Tag")
			.setDesc("Lines with this tag count as notes to self. Sub-tags such as #nts/math become topics.")
			.addText((text) =>
				text.setValue(this.plugin.settings.tag).onChange(async (value) => {
					const tag = value.replace(/^#/, "").trim();
					if (!tag) return;
					this.plugin.settings.tag = tag;
					await this.plugin.saveSettings();
				}),
			);
	}
}

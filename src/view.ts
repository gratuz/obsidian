import { ItemView, WorkspaceLeaf } from "obsidian";
import type NotesToSelfPlugin from "./main";
import { NotesToSelfList } from "./list";

export const VIEW_TYPE = "notes-to-self";

export class NotesToSelfView extends ItemView {
	constructor(leaf: WorkspaceLeaf, private plugin: NotesToSelfPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Notes to self";
	}

	getIcon(): string {
		return "message-square-dashed";
	}

	async onOpen(): Promise<void> {
		this.addChild(new NotesToSelfList(this.plugin, this.contentEl, { status: "open", search: true }));
	}
}

import { App, Modal, Setting } from "obsidian";

/** Prompts for the text of a new note to self. */
export class CaptureModal extends Modal {
	constructor(app: App, private initial: string, private onSubmit: (text: string) => void) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText("Note to self");
		let value = this.initial;
		const submit = () => {
			if (!value.trim()) return;
			this.close();
			this.onSubmit(value.trim());
		};

		new Setting(this.contentEl).setClass("nts-capture").addText((text) => {
			text.setPlaceholder("Explore how this relates to…").setValue(value);
			text.onChange((v) => (value = v));
			text.inputEl.addEventListener("keydown", (evt) => {
				if (evt.key === "Enter" && !evt.isComposing) {
					evt.preventDefault();
					submit();
				}
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});
		new Setting(this.contentEl).addButton((btn) => btn.setButtonText("Add").setCta().onClick(submit));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

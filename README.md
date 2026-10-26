# Notes to self

An Obsidian plugin for capturing "notes to self" while you write. For example, you're taking notes on a book or video and want to remember to explore a related idea later. You can then review every note to self in one list, with checkboxes and an open-only filter.

## Syntax

Any line tagged `#nts` is a note to self. A bullet, a task, or a paragraph all work:

```markdown
- #nts Explore sandboxing options that are out in the wild
- [ ] #nts Explore how this relates to information theory
- [x] #nts/math Look up the proof of the spectral theorem
```

Plain bullets and paragraphs count as open. When you check one off in the list, the plugin turns that line into a checked task (`- [x] #nts …`), so the done state lives in your note. Sub-tags such as `#nts/math` appear as topics in the list. You can change the tag in the plugin settings.

## Add a note to self

Run **Notes to self: Add note to self** from the command palette, or bind it to a hotkey in **Settings > Hotkeys**. Type the note and press Enter. The plugin adds it as a new line below the current paragraph and leaves your cursor where it was, so you can keep writing. If you select text first, the modal opens with that text filled in.

## Review your notes to self

You can review them in two places:

- **Sidebar view.** Click the ribbon icon or run **Notes to self: Open list**. The view has Open, Done, and All filters and a text filter.
- **A page in your vault.** Add an `nts` code block to any note, such as `Notes to self.md`:

  ````markdown
  ```nts
  status: open
  path: Books/
  ```
  ````

  Both lines are optional. `status` sets the starting filter (`open`, `done`, or `all`). `path` limits the list to notes under a folder.

In both places, notes to self are grouped by source note, with the most recently modified note first. Checking a box updates the source note. Click an item to jump to it, or Cmd-click (Ctrl-click on Windows and Linux) to open it in a new tab.

## Install

1. Run `npm install` and then `npm run build`.
2. Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/notes-to-self/`.
3. In Obsidian, turn on the plugin in **Settings > Community plugins**.

To rebuild automatically while you edit the source, run `npm run dev`.

"use babel";

import { remote } from "electron";
import fs from "fs";
import path from "path";
import { models } from "inkdrop";

const { dialog, app } = remote;
const { Book, Note, Tag } = models;

export function openImportDialog() {
  return dialog.showOpenDialog({
    title: "Open Quiver Notebook",
    properties: ["openFile"],
    filters: [{ name: "Quiver Library", extensions: ["qvlibrary"] }],
    defaultPath: app.getPath("home")
  });
}

export async function importNotebooksFromQuiverLibrary(files) {
  if (files.length !== 1) {
    inkdrop.notifications.addError("invalid file is selected.", {
      detail: e.stack,
      dismissable: true
    });
    return;
  }

  const library = files[0];
  const notebooks = fs
    .readdirSync(library)
    .filter(path => path.indexOf("qvnotebook") !== -1); // ignore mata.json for qvlibrary

  try {
    await notebooks.forEach(async notebook => {
      const notebookPath = path.join(library, notebook);
      await importDocumentsFromQuiverNotebook(notebookPath);
    });
  } catch (e) {
    inkdrop.notifications.addError("Failed to import the Quiver Notebook", {
      detail: e.stack,
      dismissable: true
    });
  }
}

async function importDocumentsFromQuiverNotebook(notebookDir) {
  const notebook = await findOrCreateNotebook(notebookDir);

  const notes = fs
    .readdirSync(notebookDir)
    .filter(path => path.indexOf("qvnote") !== -1); // ignore mata.json for qvnotebook

  await notes.forEach(async note => {
    const noteDir = path.join(notebookDir, note);
    await importNote(noteDir, notebook);
  });
}

async function importNote(noteDir, notebook) {
  const noteMetaJsonPath = path.join(noteDir, "meta.json");
  const noteMetaData = JSON.parse(fs.readFileSync(noteMetaJsonPath, "utf-8"));

  const { updated_at, created_at, tags } = noteMetaData;

  const contentJsonPath = path.join(noteDir, "content.json");
  const contentData = JSON.parse(fs.readFileSync(contentJsonPath, "utf-8"));

  const body = contentData.cells
    .map(({ type, data, language }) => {
      switch (type) {
        case "code":
          return `
\`\`\`${language}
${data}
\`\`\`
        `;
        case "latex":
        case "diagram":
          return `
\`\`\`
${data}
\`\`\`
        `;
        default:
          return data;
      }
    })
    .join("\n\n");

  const inkdropTags = [];
  for (let i = 0, len = tags.length; i < len; ++i) {
    inkdropTags.push(await findOrCreateTag(tags[i]));
  }
  const note = new Note({
    title: contentData.title,
    body,
    tags: inkdropTags,
    createdAt: created_at * 1000,
    updatedAt: updated_at * 1000
  });
  note.bookId = notebook._id;
  await note.save();
}

async function findOrCreateNotebook(notebookDir) {
  const notebookMetaJsonPath = path.join(notebookDir, "meta.json");
  const notebookMetaData = JSON.parse(
    fs.readFileSync(notebookMetaJsonPath, "utf-8")
  );
  const name = notebookMetaData.name;

  const state = inkdrop.store.getState();
  const foundNotebook = state.books.all.find(note => note.name === name);
  if (foundNotebook) {
    return foundNotebook;
  }

  // Or, create new note.
  const noteStat = fs.statSync(notebookDir);
  const createdAt = noteStat.birthtimeMs;
  const updatedAt = noteStat.mtimeMs;

  const book = new Book({
    name,
    createdAt,
    updatedAt
  });
  await book.save();
  return book;
}

async function findOrCreateTag(tagName) {
  const state = inkdrop.store.getState();
  const foundTag = state.tags.all.find(tag => tag.name === tagName);
  if (foundTag) {
    return foundTag._id;
  }

  const tag = new Tag({
    name: tagName
  });
  await tag.save();
  return tag._id;
}

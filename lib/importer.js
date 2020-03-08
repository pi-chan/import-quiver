"use babel";

import { remote } from "electron";
import fs from "fs";
import path from "path";
import { models } from "inkdrop";

const { dialog, app } = remote;
const { Book, Note } = models;

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
    .filter(path => path !== "meta.json"); // ignore mata.json for qvlibrary

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

async function importDocumentsFromQuiverNotebook(file) {
  const notebookMetaJsonPath = path.join(file, "meta.json");
  const notebookMetaData = JSON.parse(
    fs.readFileSync(notebookMetaJsonPath, "utf-8")
  );

  const noteStat = fs.statSync(file);
  const createdAt = noteStat.birthtimeMs;
  const updatedAt = noteStat.mtimeMs;
  const name = notebookMetaData.name;

  const book = new Book({
    name,
    createdAt,
    updatedAt
  });
  await book.save();

  // qvnotebookを開いてファイルを一つずつ処理してく
}

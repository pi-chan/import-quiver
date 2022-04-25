"use babel";

import * as remote from '@electron/remote';
import { nativeImage } from "electron";
import fs from "fs";
import path from "path";
import { models } from "inkdrop";
import mime from 'mime';
import { supportedImageFileTypes } from 'inkdrop-model'

const { dialog, app } = remote;
const { Book, Note, Tag, File } = models;

export function openImportDialog() {
  return dialog.showOpenDialog({
    title: "Open Quiver Notebook",
    properties: ["openFile"],
    filters: [
      { name: "Quiver Library", extensions: ["qvlibrary", "qvnotebook"] }
    ],
    defaultPath: app.getPath("home")
  });
}

export async function importNotebooksFromQuiverLibrary(files) {
  if (files.length !== 1) {
    inkdrop.notifications.addError("invalid file is selected.", {
      dismissable: true
    });
    return;
  }

  const library = files[0];
  const readNotebooks = (library) => {
    const ext = path.extname(library);
    if (ext === ".qvnotebook") {
      return [library];
    } else if (ext === ".qvlibrary") {
      return fs
        .readdirSync(library)
        .filter(filePath => filePath.indexOf("qvnotebook") !== -1) // ignore mata.json for qvlibrary
        .map(filePath => path.resolve(library, filePath)); // convert to absolute path
    }
    throw new Error("Unknown file extension: " + filePath);
  }

  const notebooks = readNotebooks(library);
  try {
    await notebooks.forEach(async notebookPath => {
      console.log(`processing notebook ${notebookPath}`);
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
    console.log(`processing note ${note}`);
    const noteDir = path.join(notebookDir, note);
    await importNote(noteDir, notebook);
  });
}

async function importNote(noteDir, notebook) {
  const noteMetaJsonPath = path.join(noteDir, "meta.json");
  if (!fs.existsSync(noteMetaJsonPath)) {
    return;
  }

  const contentJsonPath = path.join(noteDir, "content.json");
  if (!fs.existsSync(contentJsonPath)) {
    return;
  }

  const noteMetaData = JSON.parse(fs.readFileSync(noteMetaJsonPath, "utf-8"));
  const { updated_at, created_at, tags } = noteMetaData;

  const contentData = JSON.parse(fs.readFileSync(contentJsonPath, "utf-8"));
  const body = prepareBody(contentData);

  const inkdropTags = [];
  for (let i = 0, len = tags.length; i < len; ++i) {
    inkdropTags.push(await findOrCreateTag(tags[i]));
  }

  const note = new Note({
    title: contentData.title.slice(0, 60),
    body,
    tags: inkdropTags,
    createdAt: created_at * 1000,
    updatedAt: updated_at * 1000
  });
  note.bookId = notebook._id;
  await note.save();

  await createAttachments(noteDir, note);
}

async function createAttachments(noteDir, note) {
  const resourceDirPath = path.join(noteDir, "resources");
  if (!fs.existsSync(resourceDirPath)) {
    return [];
  }

  const files = fs.readdirSync(resourceDirPath);

  const attachments = [];
  for (let i = 0, len = files.length; i < len; ++i) {
    const file = files[i];
    const filePath = path.join(resourceDirPath, file);

    const contentType = mime.getType(filePath)
    if(!supportedImageFileTypes.includes(contentType)) {
      continue
    }

    const buffer = fs.readFileSync(filePath)
    const attachment = new File({
      contentType: contentType,
      name: file,
      contentLength: buffer.length,
      publicIn: [note._id],
      _attachments: {
        index: {
          content_type: contentType,
          data: buffer.toString("base64")
        }
      }
    });

    await attachment.save();
    attachments.push({ att: attachment, original: file });
  }

  let newBody = note.body;
  attachments.forEach(({ att, original }) => {
    const target = `quiver-image-url/${original}`;
    newBody = newBody.replace(target, `inkdrop://${att._id}`);
  });

  note.body = newBody;
  await note.save();
}

function prepareBody(contentData) {
  return contentData.cells
    .map(({ type, data, language }) => {
      switch (type) {
      case "text":
        return data
          .replace(/<div>/gi, "")
          .replace(/<\/div>/gi, "\n")
          .replace(/<br>/gi, "\n");
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
    .join("\n\n\n");
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

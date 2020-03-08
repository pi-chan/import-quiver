"use babel";

import { remote } from "electron";
const { dialog } = remote;

export function openImportDialog() {
  return dialog.showOpenDialog({
    title: "Open Quiver Notebook",
    filters: [{ extensions: ["qvnotebook"] }]
  });
}

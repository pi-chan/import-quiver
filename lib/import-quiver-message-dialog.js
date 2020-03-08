"use babel";

import * as React from "react";
import { CompositeDisposable } from "event-kit";

export default class ImportQuiverMessageDialog extends React.Component {
  componentWillMount() {
    // Events subscribed to in Inkdrop's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this dialog
    this.subscriptions.add(
      inkdrop.commands.add(document.body, {
        "import-quiver:invoke": () => this.invoke()
      })
    );
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  render() {
    return null;
  }

  importQuiverNotebook = async () => {
    const {
      openImportDialog,
      importNotebooksFromQuiverLibrary
    } = require("./importer");
    const { filePaths } = await openImportDialog();
    if (!filePaths) {
      return false;
    }
    await importNotebooksFromQuiverLibrary(filePaths);
  };

  invoke() {
    this.importQuiverNotebook();
  }
}

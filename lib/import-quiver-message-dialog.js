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
        "import-quiver:toggle": () => this.toggle()
      })
    );
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  handleNotebookSelect = bookId => {
    console.log(bookId);
    this.importQuiverNotebook(bookId);
  };

  importQuiverNotebook = async destBookId => {
    const { dialog } = this.refs;
    const { openImportDialog } = require("./importer");
    const { filePaths } = await openImportDialog();
    if (filePaths) {
      console.log(filePaths);
      dialog.dismissDialog(-1);
      // await importHTMLFromMultipleFiles(filePaths, destBookId);
    } else {
      return false;
    }
  };

  render() {
    console.log(inkdrop.components.classes);
    const { MessageDialog, NotebookListBar } = inkdrop.components.classes;
    const buttons = [
      {
        label: "Cancel",
        cancel: true
      }
    ];
    if (!MessageDialog || !NotebookListBar) return null;
    return (
      <MessageDialog
        ref="dialog"
        title="Import Notes from Quiver Notebook Directory."
        message={<div className="ui message">Please select a notebook</div>}
        buttons={buttons}
      >
        <div className="ui form">
          <div className="field">
            <NotebookListBar onItemSelect={this.handleNotebookSelect} />
          </div>
        </div>
      </MessageDialog>
    );
  }

  toggle() {
    const { dialog } = this.refs;
    if (!dialog.isShown) {
      dialog.showDialog();
    }
  }
}

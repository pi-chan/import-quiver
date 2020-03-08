# Import Quiver plugin

This plugin allows you to import notes from Quiver Library(`Quiver.qvlibrary`).

This plugin has only been tested on macOS.

# Install

```
ipm install import-quiver
```

# Usage

+ Install this plugin.
+ File -> Import -> from Quiver Library, then the file dialog opens.
+ Select your Quiver Library (`Quiver.qvlibrary`).
+ After a while, import finishes.

# Notebook and Tags

Running this plugin will automatically create new books and tags and import your notes.

If the book or tag already exists, it will not be created.

# Cells

Quiver supports five types of cells. In this importer, multiple cells in one note are imported as one note in Inkdrop.

Latex Cells and Diagram Cells are not natively supported by Inkdrop, so they are converted as text code blocks.

# Images

Save image files in Quiver as attachments of Inkdrop, and convert them by replacing the link URL in the note.

# Contribution

If you find a bug or find an unsupported Quiver note, please submit an issue or submit a pull request.

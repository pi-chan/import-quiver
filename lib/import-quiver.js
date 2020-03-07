'use babel';

import ImportQuiverMessageDialog from './import-quiver-message-dialog';

module.exports = {

  activate() {
    inkdrop.components.registerClass(ImportQuiverMessageDialog);
    inkdrop.layouts.addComponentToLayout(
      'modal',
      'ImportQuiverMessageDialog'
    )
  },

  deactivate() {
    inkdrop.layouts.removeComponentFromLayout(
      'modal',
      'ImportQuiverMessageDialog'
    )
    inkdrop.components.deleteClass(ImportQuiverMessageDialog);
  }

};

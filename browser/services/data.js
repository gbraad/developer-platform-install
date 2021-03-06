'use strict';

import Logger from './logger';
import Platform from '../services/platform';

let os = require('os');
let path = require('path');
let fs = require('fs');
let fsExtra = require('fs-extra');
let electron = require('electron');
var mkdirp = require('mkdirp');

class InstallerDataService {
  constructor($state, requirements = require('../../requirements-' + Platform.OS + '.json')) {
    this.tmpDir = os.tmpdir();

    if (Platform.OS === 'win32') {
      this.installRoot = 'c:\\DevelopmentSuite';
    } else {
      this.installRoot = '/Applications/DevelopmentSuite';
    }
    this.ipcRenderer = electron.ipcRenderer;
    this.router = $state;

    this.username = '';
    this.password = '';

    this.installableItems = new Map();
    this.toDownload = new Set();
    this.toInstall = new Set();
    this.toSetup = new Set();
    this.downloading = false;
    this.installing = false;
    this.requirements = requirements;
  }

  setup(vboxRoot, jdkRoot, devstudioRoot, cygwinRoot, cdkRoot) {
    this.vboxRoot = vboxRoot || path.join(this.installRoot, 'virtualbox');
    this.jdkRoot = jdkRoot || path.join(this.installRoot, 'jdk8');
    this.devstudioRoot = devstudioRoot || path.join(this.installRoot, 'devstudio');
    this.cygwinRoot = cygwinRoot || path.join(this.installRoot, 'cygwin');
    this.cdkRoot = cdkRoot || path.join(this.installRoot, 'cdk');
    this.cdkBoxRoot = this.cdkRoot;
    this.ocBinRoot = path.join(this.cdkRoot, 'bin');
    this.cdkMarkerFile = path.join(this.cdkRoot, '.cdk');

    if (!fs.existsSync(this.installRoot)) {
      mkdirp.sync(path.resolve(this.installRoot));
    }
    Logger.initialize(this.installRoot);
    if(Platform.OS === 'win32') {
      this.copyUninstaller();
    }
  }

  copyUninstaller() {
    let uninstallerLocation = path.resolve(this.installRoot, 'uninstaller');
    Logger.info(`Data - Create uninstaller in ${uninstallerLocation}`);
    mkdirp.sync(uninstallerLocation);
    let uninstallerPs1 = path.resolve(path.join(__dirname, '..', '..', 'uninstaller', 'uninstall.ps1'));
    // write file content to uninstaller/uninstaller.ps1
    fsExtra.copy(uninstallerPs1, path.join(uninstallerLocation, 'uninstall.ps1'), (err) => {
      if (err) {
        Logger.error('Data - ' + err);
      } else {
        Logger.info('Data - Copy ' + uninstallerPs1 + ' to ' + path.join(uninstallerLocation, 'uninstall.ps1') + ' SUCCESS');
      }
    });
  }

  addItemToInstall(key, item) {
    this.installableItems.set(key, item);
    this.toInstall.add(key);
  }

  addItemsToInstall(...items) {
    for (const item of items) {
      this.addItemToInstall(item.keyName, item);
    }
  }

  getInstallable(key) {
    return this.installableItems.get(key);
  }

  allInstallables() {
    return this.installableItems;
  }

  getRequirementByName(key) {
    let result = this.requirements[key];
    if(result) {
      return result;
    }
    throw Error(`Cannot find requested requirement ${key}`);
  }

  getUsername() {
    return this.username;
  }

  getPassword() {
    return this.password;
  }

  setCredentials(username, password) {
    this.username = username;
    this.password = password;
  }

  virtualBoxDir() {
    return this.vboxRoot;
  }

  jdkDir() {
    return this.jdkRoot;
  }

  devstudioDir() {
    return this.devstudioRoot;
  }

  cygwinDir() {
    return this.cygwinRoot;
  }

  cdkDir() {
    return this.cdkRoot;
  }

  cdkBoxDir() {
    return this.cdkBoxRoot;
  }

  cdkMarker() {
    return this.cdkMarkerFile;
  }

  ocDir() {
    return this.ocBinRoot;
  }

  installDir() {
    return this.installRoot;
  }

  tempDir() {
    return this.tmpDir;
  }

  isDownloading() {
    return this.downloading;
  }

  isInstalling() {
    return this.installing;
  }

  startDownload(key) {
    Logger.info('Download started for: ' + key);

    if (!this.isDownloading()) {
      this.downloading = true;
    }
    this.toDownload.add(key);
  }

  downloadDone(progress, key) {
    Logger.info('Download finished for: ' + key);

    let item = this.getInstallable(key);
    item.setDownloadComplete();

    this.toDownload.delete(key);
    if (this.isDownloading() && this.toDownload.size == 0) {
      this.downloading = false;
      this.ipcRenderer.send('downloadingComplete', 'all');
    }

    this.startInstall(key);

    return item.install(progress,
      () => {
        this.installDone(progress, key);
      },
      (error) => {
        Logger.error(key + ' failed to install: ' + error);
      }
    );
  }

  startInstall(key) {
    Logger.info('Install started for: ' + key);

    if (!this.isInstalling()) {
      this.installing = true;
    }
    this.toInstall.add(key);
  }

  installDone(progress, key) {
    Logger.info('Install finished for: ' + key);

    let item = this.getInstallable(key);
    return item.setup(progress,
        () => {
          this.setupDone(progress, key);
        },
        (error) => {
          Logger.error(key + ' failed to install: ' + error);
        }
    );
  }

  setupDone(progress, key) {
    var item = this.getInstallable(key);
    if(!item.isSkipped()) {
      Logger.info('Setup finished for: ' + key);
    }

    this.ipcRenderer.send('installComplete', key);
    this.toInstall.delete(key);
    item.setInstallComplete();

    if (!this.isDownloading() && this.toInstall.size == 0) {
      Logger.info('All installs complete');
      this.installing = false;
      this.router.go('start');
    }
  }

  static factory($state) {
    return new InstallerDataService($state);
  }
}

InstallerDataService.factory.$inject = ['$state'];

export default InstallerDataService;

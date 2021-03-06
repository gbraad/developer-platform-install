'use strict';

import InstallableItem from './installable-item';
import Platform from '../services/platform';

class HypervInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl) {
    super(HypervInstall.KEY, downloadUrl, '', '', installerDataSvc, false);
  }

  static get KEY() {
    return 'hyperv';
  }

  detectExistingInstall() {
    if (Platform.OS == 'win32') {
      return Platform.isHypervisorEnabled().then((detected)=>{
        if(detected) {
          this.addOption('detected', '', '', detected);
        }
        this.selectedOption = 'detected';
        return Promise.resolve(detected);
      }).then((detected)=> {
        if (detected) {
          return Promise.resolve('1.0.0');
        }
        return Promise.resolve();
      }).then((version)=>{
        if(version) {
          this.option.detected.version = version;
        }
      });
    }
    return Promise.resolve();
  }

  installAfterRequirements() {
    // Enable-WindowsOptionalFeature -FeatureName Microsoft-Hyper-V-All -Online -All -NoRestart
    return Promise.resolve();
  }

  isConfigured() {
    return Platform.OS == 'win32' && this.option.detected;
  }

}

export default HypervInstall;

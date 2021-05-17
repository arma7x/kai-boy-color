window.addEventListener("load", function() {

  localforage.setDriver(localforage.LOCALSTORAGE);

  const state = new KaiState({});

  const helpSupportPage = new Kai({
    name: 'helpSupportPage',
    data: {
      title: 'helpSupportPage'
    },
    templateUrl: document.location.origin + '/templates/helpnsupport.html',
    mounted: function() {
      this.$router.setHeaderTitle('Help & Support');
      navigator.spatialNavigationEnabled = false;
    },
    unmounted: function() {},
    methods: {},
    softKeyText: { left: '', center: '', right: '' },
    softKeyListener: {
      left: function() {},
      center: function() {},
      right: function() {}
    }
  });

  const loadRom = function($router, rom, soundOn = true) {

    var KaiBoyMachinePaused = true;
    var mainCanvas;

    var mapping = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'SoftRight': 'start',
      'SoftLeft': 'select',
      '9': 'a',
      '#': 'b'
    };
  
    function saveToSlot(slotNum) {
      if(GameBoyEmulatorInitialized()) {
        pause();
        var gameName = gameboy.name;
        var slotName = 'KBCSaveSlot_' + slotNum + '_' + gameName;
        var slotObject = gameboy.saveState();
        const DS = new DataStorage();
        DS.getFile(['kbc', slotName].join('/'), (found) => {
          console.log('Overwrite', slotName);
          KaiBoyMachinePaused = true;
          if (KaiBoyMachinePaused) {
            pause();
          }
          $router.showDialog('Overwrite', `Are you sure to overwrite ${slotName} ?`, null, 'Yes', () => {
            $router.showLoading();
            var slotBlob = new Blob([JSON.stringify(slotObject)], {type: 'application/json'})
            DS.addFile(['kbc'], slotName, slotBlob)
            .then((res) => {
              $router.showToast('Saved');
            })
            .catch((err) => {
              $router.showToast('Error');
            })
            .finally(() => {
              $router.hideLoading();
              setTimeout(() => {
                run();
                KaiBoyMachinePaused = false;
              }, 500);
            });
          }, 'No', () => {
            setTimeout(() => {
              run();
              KaiBoyMachinePaused = false;
            }, 500);
            $router.hideLoading();
            $router.setSoftKeyCenterText('PAUSE');
          }, ' ', null, () => {
            setTimeout(() => {
              run();
              KaiBoyMachinePaused = false;
            }, 500);
            $router.setSoftKeyCenterText('PAUSE');
          });
        }, (notfound) => {
          $router.showLoading();
          const DS = new DataStorage();
          var slotBlob = new Blob([JSON.stringify(slotObject)], {type: 'application/json'})
          DS.addFile(['kbc'], slotName, slotBlob)
          .then((res) => {
            console.log(res.name);
            localforage.setItem(slotName, res.name)
            .then(() => {
              $router.hideLoading();
              $router.showToast('Saved');
              setTimeout(() => {
                run();
                KaiBoyMachinePaused = false;
              }, 500);
            });
          })
          .catch((err) => {
            $router.hideLoading();
            $router.showToast('Error');
            setTimeout(() => {
              run();
              KaiBoyMachinePaused = false;
            }, 500);
          });
        });
      }
    }
    
    function removeFromSlot(slotNum) {
      var gameName = gameboy.name;
      var slotName = 'KBCSaveSlot_' + slotNum + '_' + gameName;
      const DS = new DataStorage();
      DS.getFile(['kbc', slotName].join('/'), (found) => {
        KaiBoyMachinePaused = true;
        if (KaiBoyMachinePaused) {
          pause();
        }
        $router.showDialog('Overwrite', `Are you sure remove ${slotName} ?`, null, 'Yes', () => {
          $router.showLoading();
          DS.deleteFile(['kbc'], slotName)
          .then(() => {
            $router.showToast('Removed');
          })
          .finally(() => {
            $router.hideLoading();
            setTimeout(() => {
              run();
              KaiBoyMachinePaused = false;
            }, 500);
          });
        }, 'No', () => {
          setTimeout(() => {
            run();
            KaiBoyMachinePaused = false;
          }, 500);
          $router.hideLoading();
          $router.setSoftKeyCenterText('PAUSE');
        }, ' ', null, () => {
          setTimeout(() => {
            run();
            KaiBoyMachinePaused = false;
          }, 500);
          $router.setSoftKeyCenterText('PAUSE');
        });
      }, (notfound) => {
        $router.showToast('Empty');
      });
    }

    function showSavedSlot() {
      var gameName = gameboy.name;
      var slotName1 = 'KBCSaveSlot_' + '1' + '_' + gameName;
      var slotName2 = 'KBCSaveSlot_' + '2' + '_' + gameName;
      var slotName3 = 'KBCSaveSlot_' + '3' + '_' + gameName;
      var slots = [
        { 'text': slotName1, 'path': ['kbc', slotName1].join('/') },
        { 'text': slotName2, 'path': ['kbc', slotName2].join('/') },
        { 'text': slotName3, 'path': ['kbc', slotName3].join('/') },
      ];
      $router.showOptionMenu('Saved Slot List', slots, 'LOAD', (selected) => {
        const DS = new DataStorage();
        DS.getFile(selected.path, (file) => {
          let reader = new FileReader()
          reader.onload = (e) => {
            let slotObject = null
            try {
              slotObject = JSON.parse(reader.result);
            } catch(e) {
              $router.showToast('Corrupt save data!')
            }
            if (slotObject) {
              gameboy = new GameBoyCore(mainCanvas, "");
              gameboy.savedStateFileName = selected.text;
              gameboy.returnFromState(slotObject);
              run();
              $router.showToast('Loaded');
            }
            else run();
          }
          reader.readAsBinaryString(file);
        }, (err) => {
          $router.showToast('Empty');
        });
      }, () => {});
    }

    function runGB(romBuffer) {
      mainCanvas = document.getElementById('mainCanvas');

      function inGameMode() {
        window.onkeydown = function(e) {
          if(e.key in mapping) {
            GameBoyKeyDown(mapping[e.key])
          } else if (e.key === '1') {
            if ($router.bottomSheet)
              return;
            saveToSlot('1');
          } else if (e.key === '2') {
            if ($router.bottomSheet)
              return;
            removeFromSlot('1');
          } else if (e.key === '4') {
            if ($router.bottomSheet)
              return;
            saveToSlot('2');
          } else if (e.key === '5') {
            if ($router.bottomSheet)
              return;
            removeFromSlot('2');
          } else if (e.key === '7') {
            if ($router.bottomSheet)
              return;
            saveToSlot('3');
          } else if (e.key === '8') {
            if ($router.bottomSheet)
              return;
            removeFromSlot('3');
          } else if (e.key === 'Call') {
            showSavedSlot();
          } else if (e.key === '*') {
            navigator.volumeManager.requestUp();
          } else if (e.key === '0') {
            navigator.volumeManager.requestDown();
          }
        }
        window.onkeyup = function(e) {
          if (KaiBoyMachinePaused)
            return;
          if(e.key in mapping) {
            GameBoyKeyUp(mapping[e.key])
          }
        }
        start(mainCanvas, romBuffer, soundOn);
        KaiBoyMachinePaused = false
        console.log('ROM loaded:', gameboy.name)
        $router.setHeaderTitle(gameboy.name);
      }

      inGameMode();
    }

    $router.push(
      new Kai({
        name: 'vplayer',
        data: {
          title: 'vplayer'
        },
        templateUrl: document.location.origin + '/templates/player.html',
        mounted: function() {
          this.$router.setHeaderTitle('GBC');
          const reader = new FileReader();
          reader.onload = (evt) => {
            var responseView = new Uint8ClampedArray(reader.result);
            var l = responseView.length;
            var s = '';
            for(var i=0;i<l;i++) {
              s += String.fromCharCode(responseView[i])
            }
            runGB(s);
          }
          reader.readAsArrayBuffer(rom);
        },
        unmounted: function() {
        },
        softKeyText: { left: 'Select', center: 'PAUSE', right: 'Start' },
        softKeyListener: {
          left: function() {
          },
          center: function() {
            KaiBoyMachinePaused = !KaiBoyMachinePaused;
            if (KaiBoyMachinePaused) {
              pause();
              this.$router.setSoftKeyCenterText('RESUME');
            } else {
              run();
              this.$router.setSoftKeyCenterText('PAUSE');
            }
          },
          right: function() {
          }
        },
        dPadNavListener: {
          arrowUp: function() {
          },
          arrowRight: function() {
          },
          arrowDown: function() {
          },
          arrowLeft: function() {
          },
        },
        backKeyListener: function() {
          KaiBoyMachinePaused = true;
          if (KaiBoyMachinePaused) {
            pause();
          }
          this.$router.showDialog('Exit', 'Are you sure to exit ?', null, 'Yes', () => {
            pause();
            KaiBoyMachinePaused = true;
            this.$router.pop();
          }, 'No', () => {
            setTimeout(() => {
              run();
              KaiBoyMachinePaused = false;
            }, 500);
          }, ' ', null, () => {
            setTimeout(() => {
              var cur = this.$router.stack[this.$router.stack.length -1];
              if (cur) {
                if (cur.name === 'vplayer') {
                  KaiBoyMachinePaused = false;
                  run();
                }
              }
            }, 500);
          });
          return true;
        }
      })
    );
  }

  const romsPage = new Kai({
    name: 'roms',
    data: {
      title: 'roms',
      roms: []
    },
    verticalNavClass: '.romsNav',
    templateUrl: document.location.origin + '/templates/roms.html',
    mounted: function() {
      navigator.spatialNavigationEnabled = false;
      this.$router.setHeaderTitle('Load ROM');
      localforage.getItem('KBC_ROMS')
      .then((roms) => {
        if (!roms) {
          window['__DS__'] = new DataStorage(this.methods.onChange, this.methods.onReady);
        } else {
          this.setData({roms: roms});
        }
      });
    },
    unmounted: function() {
      if (window['__DS__']) {
        window['__DS__'].destroy();
      }
    },
    methods: {
      selected: function() {},
      onChange: function(fileRegistry, documentTree, groups) {
        this.methods.runFilter(fileRegistry);
      },
      onReady: function(status) {
        if (status) {
          this.$router.hideLoading();
        } else {
          this.$router.showLoading();
        }
      },
      runFilter: function(fileRegistry) {
        var roms = []
        fileRegistry.forEach((file) => {
          var n = file.split('/');
          var n1 = n[n.length - 1];
          var n2 = n1.split('.');
          if (n2.length > 1) {
            if (n2[n2.length - 1] === 'gbc') {
              roms.push({'name': n1, 'path': file});
            }
          }
        });
        this.setData({roms: roms});
        localforage.setItem('KBC_ROMS', roms);
      }
    },
    softKeyText: { left: 'Menu', center: 'SELECT', right: 'Kill App' },
    softKeyListener: {
      left: function() {
        var menu = [
          {'text': 'Reload Library'},
          {'text': 'Help & Support'},
        ]
        this.$router.showOptionMenu('Menu', menu, 'SELECT', (selected) => {
          if (selected.text === 'Reload Library') {
            window['__DS__'] = new DataStorage(this.methods.onChange, this.methods.onReady);
          } else if (selected.text === 'Help & Support') {
            this.$router.push('helpSupportPage');
          }
        }, null);
      },
      center: function() {
        var rom = this.data.roms[this.verticalNavIndex];
        if (rom) {
          var DS;
          if (window['__DS__'])
            DS = window['__DS__'];
          else
            DS = new DataStorage();
          DS.getFile(rom.path, (success) => {
            this.$router.showDialog('Info', 'Enable sound ?', null, 'Yes', () => {
              loadRom(this.$router, success, true);
            }, 'No', () => {
              loadRom(this.$router, success, false);
            }, 'CANCEL', () => {}, null);
          }, (err) => {
            this.$router.showToast(err.toString());
          })
        }
      },
      right: function() {
        window.close();
      }
    },
    dPadNavListener: {
      arrowUp: function() {
        this.navigateListNav(-1);
      },
      arrowRight: function() {
        //this.navigateTabNav(-1);
      },
      arrowDown: function() {
        this.navigateListNav(1);
      },
      arrowLeft: function() {
        //this.navigateTabNav(1);
      },
    },
    backKeyListener: function() {}
  });

  const router = new KaiRouter({
    title: 'KaiKit',
    routes: {
      'index' : {
        name: 'romsPage',
        component: romsPage
      },
      'helpSupportPage': {
        name: 'helpSupportPage',
        component: helpSupportPage
      },
    }
  });

  const app = new Kai({
    name: '_APP_',
    data: {},
    templateUrl: document.location.origin + '/templates/template.html',
    mounted: function() {},
    unmounted: function() {},
    router,
    state
  });

  try {
    app.mount('app');
  } catch(e) {
    console.log(e);
  }

  

  function displayKaiAds() {
    var display = true;
    if (window['kaiadstimer'] == null) {
      window['kaiadstimer'] = new Date();
    } else {
      var now = new Date();
      if ((now - window['kaiadstimer']) < 300000) {
        display = false;
      } else {
        window['kaiadstimer'] = now;
      }
    }
    console.log('Display Ads:', display);
    if (!display)
      return;
    getKaiAd({
      publisher: 'ac3140f7-08d6-46d9-aa6f-d861720fba66',
      app: 'k-music',
      slot: 'kaios',
      onerror: err => console.error(err),
      onready: ad => {
        ad.call('display')
        setTimeout(() => {
          document.body.style.position = '';
        }, 1000);
      }
    })
  }

  displayKaiAds();

  document.addEventListener('visibilitychange', function(ev) {
    if (document.visibilityState === 'visible') {
      displayKaiAds();
    }
  });

});

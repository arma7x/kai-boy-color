window.addEventListener("load", function() {

  localforage.setDriver(localforage.LOCALSTORAGE);

  const state = new KaiState({});

  const loadRom = function($router, rom) {

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
        $router.showLoading();
        pause();
        var gameName = gameboy.name;
        var slotName = 'KaiBoySaveSlot' + slotNum + '_' + gameName;
        var slotObject = gameboy.saveState();
        localforage.getItem(slotName)
        .then((blob) => {
          $router.hideLoading();
          if (blob) {
            console.log('Overwrite', slotName);
            KaiBoyMachinePaused = true;
            if (KaiBoyMachinePaused) {
              pause();
            }
            $router.showDialog('Overwrite', `Are you sure to overwrite ${slotName} ?`, null, 'Yes', () => {
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
          } else {
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
          }
        })
        .catch(() => {
          run();
          $router.hideLoading();
        });
      }
    }
    
    function removeFromSlot(slotNum) {
      var gameName = gameboy.name;
      var slotName = 'KaiBoySaveSlot' + slotNum + '_' + gameName;
      localforage.getItem(slotName)
      .then((buff) => {
        if (!buff) {
          $router.showToast('Empty');
        } else {
          KaiBoyMachinePaused = true;
          if (KaiBoyMachinePaused) {
            pause();
          }
          $router.showDialog('Overwrite', `Are you sure remove ${slotName} ?`, null, 'Yes', () => {
            $router.showLoading();
            localforage.removeItem(slotName)
            .then(() => {
              $router.hideLoading();
              $router.showToast('Removed');
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
        }
      });
    }

    function showSavedSlot() {
      var gameName = gameboy.name;
      var slots = [];
      var slotName1 = 'KaiBoySaveSlot' + '1' + '_' + gameName;
      var slotName2 = 'KaiBoySaveSlot' + '4' + '_' + gameName;
      var slotName3 = 'KaiBoySaveSlot' + '7' + '_' + gameName;
      localforage.getItem(slotName1)
      .then((blob1) => {
        if (blob1) {
          slots.push({ 'text': slotName1, 'buff': blob1 });
        }
        return localforage.getItem(slotName2);
      })
      .then((blob2) => {
        if (blob2) {
          slots.push({ 'text': slotName2, 'buff': blob2 });
        }
        return localforage.getItem(slotName3);
      })
      .then((blob3) => {
        if (blob3) {
          slots.push({ 'text': slotName3, 'buff': blob3 });
        }
        if (slots.length === 0) {
          $router.showToast('Empty');
          return;
        } else {
          $router.showOptionMenu('Saved Slot List', slots, 'LOAD', (selected) => {
            const DS = new DataStorage();
            DS.getFile(selected.buff, (file) => {
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
            });
          }, () => {});
        }
      });
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
        var soundOn = true;
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
          KaiBoyMachinePaused = !KaiBoyMachinePaused;
          if (KaiBoyMachinePaused) {
            pause();
          }
          this.$router.showDialog('Exit', 'Are you sure to exit ?', null, 'Yes', () => {
            this.$router.pop();
          }, 'No', () => {
            setTimeout(() => {
              run();
              KaiBoyMachinePaused = !KaiBoyMachinePaused;
            }, 500);
            this.$router.setSoftKeyCenterText('PAUSE');
          }, ' ', null, () => {
            KaiBoyMachinePaused = false;
            run();
            $router.setSoftKeyCenterText('PAUSE');
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
      window['__DS__'] = new DataStorage(this.methods.onChange, this.methods.onReady);
    },
    unmounted: function() {
      window['__DS__'].destroy();
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
      }
    },
    softKeyText: { left: 'Help', center: 'SELECT', right: 'Kill App' },
    softKeyListener: {
      left: function() {},
      center: function() {
        var rom = this.data.roms[this.verticalNavIndex];
        if (rom) {
          window['__DS__'].getFile(rom.path, (success) => {
            loadRom(this.$router, success);
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
    backKeyListener: function() {
      this.components = [];
    }
  });

  const router = new KaiRouter({
    title: 'KaiKit',
    routes: {
      'index' : {
        name: 'romsPage',
        component: romsPage
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
    //setTimeout(function() {
      //secondChild.mount('app');
    //}, 2000);
  } catch(e) {
    console.log(e);
  }
});

window.addEventListener("load", function() {

  localforage.setDriver(localforage.LOCALSTORAGE);

  const state = new KaiState({});

  const loadRom = function($router, rom) {

    var KaiBoyMachinePaused = true;

    var mapping = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'SoftRight': 'start',
      'SoftLeft': 'select',
      '9': 'a',
      '8': 'b'
    };
  
    function saveToSlot(slotNum) {
      if(GameBoyEmulatorInitialized()) {
        $router.showLoading();
        pause();
        var gameName = gameboy.name;
        var slotName = 'KaiBoySaveSlot' + slotNum + '_' + gameName;
        var slotObject = gameboy.saveState();
        var slotBlob = new Blob([JSON.stringify(slotObject)], {type: 'application/json'});
        localforage.getItem(slotName)
        .then((blob) => {
          if (blob) {
            run();
            $router.hideLoading();
          } else {
            localforage.setItem(slotName, slotBlob)
            .then(() => {
              run();
              $router.showToast('Saved');
              $router.hideLoading();
            });
          }
        })
        .catch(() => {
          run();
          $router.hideLoading();
        });
      }
    }
    
    function loadFromSlot(slotNum, canvas) {
      if(GameBoyEmulatorInitialized()) {
        pause();
        let gameName = gameboy.name;
        let slotName = 'KaiBoySaveSlot' + slotNum + '_' + gameName;
        run();
      }
    }

    function runGB(romBuffer) {
      var mainCanvas = document.getElementById('mainCanvas');

      function inGameMode() {
        window.onkeydown = function(e) {
          if(e.key in mapping) {
            GameBoyKeyDown(mapping[e.key])
          } else if (e.key === '1') {
            saveToSlot('1');
            // console.log(JSON.stringify(gameboy.saveState()).length);
          }
        }
        window.onkeyup = function(e) {
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
            for(let i=0;i<l;i++) {
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
            KaiBoyMachinePaused = !KaiBoyMachinePaused;
            run();
            this.$router.setSoftKeyCenterText('PAUSE');
          }, ' ', null, () => {
            // closecb
          })
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

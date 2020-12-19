import {
  ExtendedObject3D,
  FirstPersonControls,
  Scene3D,
  THREE,
} from '@enable3d/phaser-extension'

import { createWorldFromBSP } from '../genesis3d/bsp'

import WPS from '../kaitai/adoom_wps'
import { KaitaiStream } from 'kaitai-struct'

const numberSize = 44;
const iconSize = 34;

export default class MainScene extends Scene3D {
  player: ExtendedObject3D
  keys: any
  firstPersonControls: FirstPersonControls
  tmpVec3 = new THREE.Vector3();
  // HUD variables
  healthDigits: Phaser.GameObjects.Sprite[] = [];
  ammoDigits: Phaser.GameObjects.Sprite[] = [];
  weaponIcons: Phaser.GameObjects.Sprite[] = [];
  // Stats
  health: number = 100;
  ammo: number = 50;

  constructor() {
    super({ key: 'MainScene' })
  }

  init() {
    this.accessThirdDimension()
  }

  preload() {
    this.load.binary('bsp', 'assets/levels/level1_1.bsp')
    this.load.binary('wps', 'assets/levels/level1_1.wps')

    this.load.spritesheet('numbers', 'assets/img/HUDFont2.png', {
      frameWidth: numberSize,
      frameHeight: numberSize,
    })
    this.load.spritesheet('icons', 'assets/img/HUDIcons2.png', {
      frameWidth: iconSize,
      frameHeight: iconSize,
    })
  }

  drawNumber(number, sprites: Phaser.GameObjects.Sprite[]) {
    number = Math.floor(number)
    let c1 = Math.floor(number / 100);
    let c2 = Math.floor((number % 100) / 10);
    let c3 = Math.floor(number % 10);
    sprites[0].setFrame(c1)
    sprites[1].setFrame(c2)
    sprites[2].setFrame(c3)
  }

  createHUD() {
    const scale = 2;
    const fontSpacing = (numberSize -10) * scale;
    const iconSpacing = (iconSize + 5) * scale;

    // Available Weapons
    this.weaponIcons = [ // frame 9 is empty frame
      this.add.sprite(10 + 0*iconSpacing, 10, 'icons', 0).setOrigin(0,0),
      this.add.sprite(10 + 1*iconSpacing, 10, 'icons', 1).setOrigin(0,0).setVisible(false),
      this.add.sprite(10 + 2*iconSpacing, 10, 'icons', 2).setOrigin(0,0).setVisible(false),
      this.add.sprite(10 + 3*iconSpacing, 10, 'icons', 3).setOrigin(0,0).setVisible(false),
      this.add.sprite(10 + 4*iconSpacing, 10, 'icons', 4).setOrigin(0,0).setVisible(false),
    ];
    this.weaponIcons.forEach(w => w.scale = scale);

    // Helper for creating set of 3 digits using sprites
    const createDigits = (x, y): Phaser.GameObjects.Sprite[] => {
      let digits: Phaser.GameObjects.Sprite[] = [
        this.add.sprite(x, y - fontSpacing, 'numbers', 0).setOrigin(0,0),
        this.add.sprite(x + fontSpacing, y - fontSpacing, 'numbers', 0).setOrigin(0,0),
        this.add.sprite(x + fontSpacing * 2, y - fontSpacing, 'numbers', 0).setOrigin(0,0),
      ];
      digits.forEach(spr => spr.scale = scale);
      return digits;
    }

    // Health & Ammo
    this.healthDigits = createDigits(10, this.cameras.main.height - 20);
    this.add.sprite(15 + 210, this.cameras.main.height - 12 - 34*2, 'icons', 10).setOrigin(0,0).scale = 2;
    this.ammoDigits = createDigits(this.cameras.main.width - 240, this.cameras.main.height - 20);
    this.add.sprite(this.cameras.main.width - 300, this.cameras.main.height - 12 - 34*2, 'icons', 11).setOrigin(0,0).scale = 2;
  }

  createLevel() {
    const scale = 0.02;
    
    const bsp = this.cache.binary.get('bsp');
    const wps = this.cache.binary.get('wps');

    const worldMesh = createWorldFromBSP(bsp);
    worldMesh.children.forEach(c => {
      c.scale.setScalar(scale);  
    })
    console.log(worldMesh);
    this.third.add.existing( worldMesh );

    // XXX currently only create physics for the world mesh itself, not the models inside
    // (some of them are doors, and need to be a seperate physics object)
    this.third.physics.add.existing( worldMesh.children[0] as ExtendedObject3D, {
      shape: 'concave',
      mass: 0,
      addChildren: false,
    });

    const parsed = new WPS(new KaitaiStream(wps));
    console.log(parsed);
  }

  createPlayer() {
    let v = new THREE.Vector3();
    v.set(2825,-521,3390).multiplyScalar(0.02); // from entities

    // add player
    this.player = new ExtendedObject3D();
    this.player.position.copy(v)
    this.third.physics.add.existing(this.player, {
      shape: 'sphere',
      radius: 0.3,
      offset: { y: 0.9 },
    });
    this.player.body.setAngularFactor(0, 0, 0)
    this.player.body.setFriction(0.8)
    this.player.castShadow = false
  }

  create() {
    this.third.warpSpeed('camera', 'light', 'sky').then(({lights}) => {
      lights!.directionalLight.intensity = 0.5;
      lights!.ambientLight.intensity = 0.3;
    })

    //this.third.physics.debug?.enable();

    this.createHUD();
    this.createLevel();
    this.createPlayer();

    // add first person controls
    this.firstPersonControls = new FirstPersonControls(this.third.camera, this.player, {})

    // lock the pointer and update the first person control
    this.input.on('pointerdown', () => {
      this.input.mouse.requestPointerLock()
    })
    this.input.on('pointermove', pointer => {
      if (this.input.mouse.locked) {
        this.firstPersonControls.update(pointer.movementX, pointer.movementY)
      }
    })
    this.events.on('update', () => {
      this.firstPersonControls.update(0, 0)
    })

    // add keys
    this.keys = {
      a: this.input.keyboard.addKey('a'),
      w: this.input.keyboard.addKey('w'),
      d: this.input.keyboard.addKey('d'),
      s: this.input.keyboard.addKey('s'),
      space: this.input.keyboard.addKey(32)
    }
  }

  update(time: number, delta: number) {
    if (!this.player || !this.keys) return

    this.drawNumber(this.health, this.healthDigits);
    this.drawNumber(this.ammo, this.ammoDigits);

    const rotation = this.third.camera.getWorldDirection(this.tmpVec3)
    const theta = Math.atan2(rotation.x, rotation.z)
    const speed = 3

    const forward = this.keys.w.isDown;
    const backward = this.keys.s.isDown;
    const left = this.keys.a.isDown;
    const right = this.keys.d.isDown;

    let vx = 0, vy = this.player.body.velocity.y, vz = 0
    if (forward) {
      vx += Math.sin(theta) * speed
      vz += Math.cos(theta) * speed
    } else if (backward) {
      vx -= Math.sin(theta) * speed
      vz -= Math.cos(theta) * speed
    }

    if (left) {
      vx += Math.sin(theta + Math.PI * 0.5) * speed
      vz += Math.cos(theta + Math.PI * 0.5) * speed
    } else if (right) {
      vx -= Math.sin(theta + Math.PI * 0.5) * speed
      vz -= Math.cos(theta + Math.PI * 0.5) * speed
    }

    this.player.body.setVelocity(vx, vy, vz)
  }
}

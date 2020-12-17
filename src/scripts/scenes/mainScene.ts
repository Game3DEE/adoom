import {
  ExtendedObject3D,
  FirstPersonControls,
  Scene3D,
  THREE,
} from '@enable3d/phaser-extension'

import { createWorldFromBSP } from '../genesis3d/bsp'

import WPS from '../kaitai/adoom_wps'
import { KaitaiStream } from 'kaitai-struct'

export default class MainScene extends Scene3D {
  player: ExtendedObject3D
  keys: any
  firstPersonControls: FirstPersonControls
  tmpVec3 = new THREE.Vector3();

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
      frameWidth: 44,
      frameHeight: 44,
    })
    this.load.spritesheet('icons', 'assets/img/HUDIcons2.png', {
      frameWidth: 34,
      frameHeight: 34,
    })
  }

  drawNumber(x, y, number) {
    let fontSize = 34 * 2;
    let c1 = Math.floor(number / 100);
    let c2 = Math.floor((number % 100) / 10);
    let c3 = Math.floor(number % 10);
    this.add.sprite(x, y - fontSize, 'numbers', c1).setOrigin(0,0).scale = 2;
    this.add.sprite(x + fontSize, y - fontSize, 'numbers', c2).setOrigin(0,0).scale = 2;
    this.add.sprite(x + fontSize * 2, y - fontSize, 'numbers', c3).setOrigin(0,0).scale = 2;
  }

  create() {
    this.third.warpSpeed('camera', 'light', 'sky')

    const scale = 0.02;
    
    //this.third.physics.debug?.enable();

    // Guns
    this.add.sprite(10, 10, 'icons', 0).setOrigin(0,0).scale = 2;

    // Health & Ammo
    this.drawNumber(10, this.cameras.main.height - 20, 100);
    this.add.sprite(15 + 210, this.cameras.main.height - 12 - 34*2, 'icons', 10).setOrigin(0,0).scale = 2;
    this.drawNumber(this.cameras.main.width - 240, this.cameras.main.height - 20, 50);
    this.add.sprite(this.cameras.main.width - 300, this.cameras.main.height - 12 - 34*2, 'icons', 11).setOrigin(0,0).scale = 2;

    const bsp = this.cache.binary.get('bsp');
    const wps = this.cache.binary.get('wps');

    const worldMesh = createWorldFromBSP(bsp);
    worldMesh.children.forEach(c => {
      c.scale.setScalar(scale);  
    })
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

    let v = new THREE.Vector3();
    v.copy(parsed.items[0].pos).multiplyScalar(0.02);

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


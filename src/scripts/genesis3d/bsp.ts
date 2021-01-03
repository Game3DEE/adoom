import BSP from '../kaitai/genesis3d_bsp';

import { THREE } from '@enable3d/phaser-extension';

import { KaitaiStream } from 'kaitai-struct';

interface Entity {
  name: string
  classname: string
  properties: Map<string,string>
}

export const createWorldFromBSP = (
  data: ArrayBuffer,
  exlcudeSkyBox: boolean = true,
): { entities: Entity[], world: THREE.Group } => {
  let textable = {};

  function getMaterialByTexture(texId, textures, texdata, palettes) {
    // Shortcut - texture already setup
    if (textable[texId] !== undefined)
      return textable[texId];
  
    // Create texture
    const tex = textures[texId];
    const palette = palettes[tex.paletteIndex];
    let offset = tex.offset;
    const buf = new Uint8Array(tex.width * tex.height * 3);
  
    for (var y = 0; y < tex.height; y++) {
      for (var x = 0; x < tex.width; x++) {
        const idx = (tex.width * y + x) * 3;
        const pix = texdata[offset++];
  
        buf[idx+0] = palette[pix * 3 + 0];
        buf[idx+1] = palette[pix * 3 + 1];
        buf[idx+2] = palette[pix * 3 + 2];
      }
    }
  
    let map = new THREE.DataTexture(buf, tex.width, tex.height, THREE.RGBFormat, THREE.UnsignedByteType,
      THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping);
    map.needsUpdate = true;
  
    return textable[texId] = new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide });
  }

  let bsp = new BSP(new KaitaiStream(data));
  
  let models, faces, verts, vertIndex;
  let texinfos, textures, texdata, palettes;
  let entities;

  bsp.chunks.forEach( chunk => {
    switch(chunk.type) {
      case BSP.ChunkType.ENTDATA:
        entities = chunk.entityList.entities;
        break;
      case BSP.ChunkType.PALETTES:
        palettes = chunk.elements;
        break;
      case BSP.ChunkType.TEXINFOS:
        texinfos = chunk.elements;
        break;
      case BSP.ChunkType.TEXTURES:
        textures = chunk.elements;
        break;
      case BSP.ChunkType.TEXDATA:
        texdata = chunk.data;
        break;
      case BSP.ChunkType.MODELS:
        models = chunk.elements;
        break;
      case BSP.ChunkType.FACES:
        faces = chunk.elements;
        break;
      case BSP.ChunkType.VERTS:
        verts = chunk.elements;
        break;
      case BSP.ChunkType.VERT_INDEX:
        vertIndex = chunk.elements;
        break;
    }
  });

  function createModel(model) {
    let materials: THREE.Material[] = [];
    let position: number[] = [];
    let uv: number[] = [];
    let lastTexId = -1;
    let groups: any[] = [];
    let currGroup = { start: -1, end: -1, materialIndex: -1 };
    //let index = [];

    let vec = new THREE.Vector3();
    for (let i = model.faceStart; i < model.faceStart + model.faceCount; i++) {
      const face = faces[i];
      const texInfo = texinfos[face.texInfo];
      if ((texInfo.flags & (1<<2)) != 0 && exlcudeSkyBox) {
        continue
      }
      if (lastTexId != texInfo.texture) {
        // Check if we're the first group ever
        if (currGroup.start == -1) {
          currGroup.start = 0;
        } else {
          currGroup.end = position.length / 3;
          groups.push( currGroup );
          currGroup = {
            start: currGroup.end,
            end: -1,
            materialIndex: -1,
          };
        }
        currGroup.materialIndex = materials.length;
        materials.push( getMaterialByTexture(texInfo.texture, textures, texdata, palettes) );
        lastTexId = texInfo.texture;
      }

      let uvs: number[] = [];
      let minU = Number.MAX_VALUE;
      let minV = Number.MAX_VALUE;
      for (let k = 0; k < face.vertCount -2; k++) {
        let v = verts[vertIndex[face.vertStart]];
        vec.copy(v);
        let tu = vec.dot(texInfo.vecs[0]);
        let tv = vec.dot(texInfo.vecs[1]);
        if (tu < minU) minU = tu;
        if (tv < minV) minU = tu;
        position.push( v.x, v.y, v.z );
        uvs.push( tu, tv );

        v = verts[vertIndex[face.vertStart + k+1]];
        vec.copy(v);
        tu = vec.dot(texInfo.vecs[0]);
        tv = vec.dot(texInfo.vecs[1]);
        if (tu < minU) minU = tu;
        if (tv < minV) minU = tu;
        position.push( v.x, v.y, v.z );
        uvs.push( tu, tv );

        v = verts[vertIndex[face.vertStart + k+2]];
        vec.copy(v);
        tu = vec.dot(texInfo.vecs[0]);
        tv = vec.dot(texInfo.vecs[1]);
        if (tu < minU) minU = tu;
        if (tv < minV) minU = tu;
        position.push( v.x, v.y, v.z );
        uvs.push( tu, tv );
      }

      const scaleU = 1.0 / texInfo.drawScale[0];
      const scaleV = 1.0 / texInfo.drawScale[1];
      const { width, height } = textures[texInfo.texture];
      const shiftU = texInfo.shift[0];
      const shiftV = texInfo.shift[1];
      for (let i = 0; i < uvs.length; i += 2) {
        let u = uvs[i+0], v = uvs[i+1];
        uv.push(
          (u * scaleU + shiftU) / width,
          (v * scaleV + shiftV) / height,
        );
      }
    }

    currGroup.end = position.length / 3;
    groups.push( currGroup );

    let geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    groups.forEach(({start,end,materialIndex}) => geo.addGroup(start,end-start,materialIndex));

    return new THREE.Mesh(geo, materials);
  }

  let group = new THREE.Group();
  models.forEach(model => {
    let mesh = createModel(model);
    group.add(mesh);
  })

  let ents = entities.map(ent => {
    let classname, name;
    let properties = new Map<string,string>();

    ent.pairs.forEach(pair => {
      switch(pair.key) {
        case 'classname':
          classname = pair.value;
          break;
        case '%name%':
          name = pair.value;
          break;
        default:
          properties.set(pair.key, pair.value)
      }
    });
    return {
      name,
      classname,
      properties,
    }
  });
  console.log(ents)

  // Move and name submodels in the bsp
  const pos = new THREE.Vector3();
  ents.forEach(ent => {
    if (ent.classname === '%Model%') {
      const origin = ent.properties.get('origin').split(' ').map(v => parseFloat(v));
      if (ent.properties.has('Model')) {
        const modelNr = parseInt(ent.properties.get('Model'));
        let m = group.children[modelNr] as THREE.Mesh;
        m.name = ent.name;
        // (we translate the geometry so we can easily
        // rotate the objects from their origin)
        m.position.fromArray(origin);
        m.geometry.translate(-origin[0], -origin[1], -origin[2]);
      }
    }
  })

  return {
    world: group,
    entities: ents,
  };
}

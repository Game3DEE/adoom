meta:
  id: genesis3d_bsp
  file-extension: bsp
  endian: le
  encoding: utf-8

seq:
  - id: chunks
    type: chunk
    repeat: eos

types:
  chunk:
    seq:
      - id: type
        enum: chunk_type
        type: s4
      - id: element_size
        type: s4
      - id: element_count
        type: s4
      - id: elements
        if: not is_data_chunk_type and not is_ent_data
        size: element_size
        type:
          switch-on: type
          cases:
            chunk_type::header: header
            chunk_type::nodes: node
            chunk_type::bnodes: bnode
            chunk_type::area_portals: area_portal
            chunk_type::areas: area
            chunk_type::leafs: leaf
            chunk_type::clusters: cluster
            chunk_type::planes: plane
            chunk_type::leaf_sides: leaf_side
            chunk_type::faces: face
            chunk_type::sky_data: sky_data
            chunk_type::models: model
            chunk_type::textures: texture
            chunk_type::texinfos: texture_info
            chunk_type::portal: portal
            chunk_type::vert_index: u4
            chunk_type::verts: vector3
        repeat: expr
        repeat-expr: element_count
      - id: data
        size: element_size * element_count
        if: is_data_chunk_type
      - id: entity_list
        type: entity_list
        if: is_ent_data
        size: element_size * element_count
    instances:
      is_ent_data:
          value: type == chunk_type::entdata
      is_data_chunk_type:
        value: type == chunk_type::texdata or type == chunk_type::lightdata

  header:
    seq:
      - id: magic
        contents: [ 'GBSP', 0, 0, 0, 0 ]
      - id: version
        type: u4
      - id: bsp_time
        type: system_time

  plane:
    seq:
      - id: normal
        type: vector3
      - id: dist
        type: f4
      - id: type
        type: s4 # TODO: enum!

  node:
    seq:
      - id: children
        type: s4
        repeat: expr
        repeat-expr: 2
      - id: face_count
        type: s4
      - id: first_face
        type: s4
      - id: plane_num
        type: s4
      - id: min_s
        type: vector3
      - id: max_s
        type: vector3

  bnode:
    seq:
      - id: children
        type: s4
        repeat: expr
        repeat-expr: 2
      - id: plane_num
        type: s4

  area_portal:
    seq:
      - id: model_num
        type: s4
      - id: area
        type: s4

  area:
    seq:
      - id: area_portal_count
        type: s4
      - id: first_area_portal
        type: s4

  leaf:
    seq:
      - id: contents
        type: s4
      - id: min_s
        type: vector3
      - id: max_s
        type: vector3
      - id: first_face
        type: s4
      - id: face_count
        type: s4
      - id: first_portal
        type: s4
      - id: portal_count
        type: s4
      - id: cluster
        type: s4
      - id: area
        type: s4
      - id: first_side
        type: s4
      - id: side_count
        type: s4

  cluster:
    seq:
      - id: vis_ofs
        type: s4

  leaf_side:
    seq:
      - id: plane_count
        type: s4
      - id: plane_side
        type: s4

  face:
    seq:
      - id: vert_start
        type: s4
      - id: vert_count
        type: s4
      - id: plane_count
        type: s4
      - id: plane_side
        type: s4
      - id: tex_info
        type: s4
      - id: light_offset
        type: s4
      - id: l_width
        type: s4
      - id: l_height
        type: s4
      - id: l_types
        type: u1
        repeat: expr
        repeat-expr: 4

  sky_data:
    seq:
      - id: axis
        type: vector3
      - id: degrees_per_minute
        type: f4
      - id: textures
        type: s4
        repeat: expr
        repeat-expr: 6
      - id: draw_scale
        type: f4

  model:
    seq:
      - id: root_node
        type: s4
        repeat: expr
        repeat-expr: 2
      - id: min_s
        type: vector3
      - id: max_s
        type: vector3
      - id: origin
        type: vector3
      - id: face_start
        type: s4
      - id: face_count
        type: s4
      - id: leaf_start
        type: s4
      - id: leaf_count
        type: s4
      - id: cluster_start
        type: s4
      - id: cluster_count
        type: s4
      - id: areas
        type: s4
        repeat: expr
        repeat-expr: 2
      - id: invalid_motion_ptr
        type: u4

  texture:
    seq:
      - id: name
        type: strz
        size: 32
      - id: flags
        type: u4
      - id: width
        type: s4
      - id: height
        type: s4
      - id: offset
        type: s4
      - id: palette_index
        type: s4
    instances:
      f_mirror:
        value: (flags & 1) != 0
      f_fullbright:
        value: (flags & 2) != 0
      f_sky:
        value: (flags & 4) != 0
      f_light:
        value: (flags & 8) != 0
      f_transparent:
        value: (flags & 16) != 0
      f_gouraud:
        value: (flags & 32) != 0
      f_flat:
        value: (flags & 64) != 0
      f_no_lightmap:
        value: (flags & 0x10000) != 0

  texture_info:
    seq:
      - id: vecs
        type: vector3
        repeat: expr
        repeat-expr: 2
      - id: shift
        type: f4
        repeat: expr
        repeat-expr: 2
      - id: draw_scale
        type: f4
        repeat: expr
        repeat-expr: 2
      - id: flags
        type: s4
      - id: face_light
        type: f4
      - id: reflective_scale
        type: f4
      - id: alpha
        type: f4
      - id: mip_map_bias
        type: f4
      - id: texture
        type: s4
  
  portal:
    seq:
      - id: origin
        type: vector3
      - id: leaf_to
        type: s4

  entity_list:
    seq:
      - id: num_entities
        type: u4
      - id: entities
        type: entity
        repeat: expr
        repeat-expr: num_entities

  entity:
    seq:
      - id: pair_count
        type: u4
      - id: pairs
        type: entity_pair
        repeat: expr
        repeat-expr: pair_count

  entity_pair:
    seq:
      - id: key_len
        type: u4
      - id: key
        type: strz
        size: key_len
      - id: value_len
        type: u4
      - id: value
        type: strz
        size: value_len

  system_time:
    seq:
      - id: year
        type: s2
      - id: month
        type: s2
      - id: day_of_week
        type: s2
      - id: day
        type: s2
      - id: hour
        type: s2
      - id: minute
        type: s2
      - id: second
        type: s2
      - id: milliseconds
        type: s2

  vector3:
    seq:
      - id: x
        type: f4
      - id: y
        type: f4
      - id: z
        type: f4

enums:
  chunk_type:
    0: header
    1: models
    2: nodes
    3: bnodes
    4: leafs
    5: clusters
    6: areas
    7: area_portals
    8: leaf_sides
    9: portals
    10: planes
    11: faces
    12: leaf_faces
    13: vert_index
    14: verts
    15: rgb_verts
    16: entdata
    17: texinfos
    18: textures
    19: texdata
    20: lightdata
    21: visdata
    22: sky_data
    23: palettes
    24: motions
    0xffff: end

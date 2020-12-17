meta:
  id: adoom_wps
  file-extension: wps
  endian: le
  encoding: ascii

seq:
  - id: item_count
    type: u4
  - id: val2
    type: u4
  - id: val3
    type: u4
  - id: val4
    type: u4
  - id: signature
    type: strz
    size: 32
  - id: items
    type: item
    repeat: expr
    repeat-expr: item_count

types:
  item:
    seq:
      - id: pos
        type: vector3f
      - id: val1
        type: u4
      - id: val2
        type: u4
      - id: name
        type: strz
        size: 64
      - id: val3
        type: u4
      - id: val4
        type: u4
      - id: val5
        type: u4
      - id: val6
        type: s4
      - id: data
        size: 24

  vector3f:
    seq:
      - id: x
        type: f4
      - id: y
        type: f4
      - id: z
        type: f4

/**
 * SHA-256 of every file SpecWeave 3.0.0 to 3.0.23 installed into `.claude/skills/sw-<name>/` and
 * `.agents/skills/sw-<name>/` (the project form of each plugin skill file, at every
 * 3.0.x tag). Those versions wrote no install manifest, so a folder whose every file
 * is listed here is SpecWeave's unmodified copy; anything else is the user's.
 * Generated once from the release tags; 3.1 and later record a manifest instead.
 *
 * @module core/skills/legacy-skill-hashes
 */

export const LEGACY_SKILL_HASHES: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  auto: {
    'SKILL.md': [
      '49992bd0df4c0c22839294ef592f622e566904b39add3746cad82b04e44d4384',
      '52dd05b2c0ce79e031901fe3e33236f6c048c5a1c55f60b6249c29e7eb812b5c',
    ],
  },
  brainstorm: {
    'SKILL.md': [
      '336ee144201a850254cccef8ab7581a10017ccde4211618eb32c5e9060857fbd',
      'fa70e9ecf859b24014a0de42fd866e8078f2777b241b4ea1d3268715d4bef273',
    ],
    'references/credits.md': [
      '1b242664dd3764db5f5549dc33b01016658b8464140c765ada62683f2c020f8f',
    ],
  },
  do: {
    'SKILL.md': [
      '8ffcc20df2c167941fee13a27a955fe73358d85e3f61740307b7aea8f87f48d5',
      'a53d47d1acb834653a61ecfd49150252e973f56eb38aba814fb2f5dd5419592c',
    ],
  },
  done: {
    'SKILL.md': [
      '79d657717035cf0a5aaba6c221ba7efe14f4b13c69ad9c0e69dd4f9d20c6e995',
    ],
  },
  handoff: {
    'SKILL.md': [
      '0b1ed137dca176c066a2157ee7b590d91e6a1f8a9f9e3331f5ccb19df3de23b0',
      '44cb707de587a69f356a714da0386add7052db75dd394b79aac6ab690f3f08a1',
      '4745a333b22e06f714561c8f594985ace26fa4ce88f4ee1cf5e07b32163ee73e',
      '54498e7842cb4892f7742a4a62b473eb0411c0653444d5833250c4bf4abec093',
      '807d8db53317bffb1f89aa9aaf85dcd65d9e166bb00b400382dfd28bb01af566',
      'be7c199efefae385abac0121367f39969373a6d1c9af7bcb3df6048e1f026d2d',
      'ec6ef3e21fed4be38aae37ea702680cd503eb3abc4d70c60f2b489fffb4d0320',
    ],
  },
  increment: {
    'SKILL.md': [
      '1ae7d50cfc733df5144a8c8a414758e8fa1c586fa60dd3a6c7ce668b6788cfe6',
      '52acee9e475c171aac02148adf26ddfe6b1c30c6e3fc8bee6eb64a93278178cb',
      'd8bd25aa978f0f4737b66292da0061bcceafa8c9b5008c6921243d5ebad92201',
    ],
  },
  jev: {
    'SKILL.md': [
      '64b89a36f9c40b32dd3ed8155b3136d4bb3ad5f46e2c5aa41cd7979af00c30bb',
      'ecceb1a592ad003810f984ae991a5f4e9e226c4212ae771507eebdb4b6c3272f',
    ],
  },
  project: {
    'SKILL.md': [
      '4c4a569cb5b440ef9a8af9324446a8b162ec1fe200e7ed46762c9a0cb4bb0b12',
    ],
  },
  review: {
    'SKILL.md': [
      '4ea6d9b3c0b4d271a3de864a765e02b998363a246930ab8418afe351aee2d5c0',
      '7ce84b4b2106151d3f0d486cfc3079d8e9a60da74694ea8cfbc7f6b5796d830c',
    ],
  },
  sync: {
    'SKILL.md': [
      '5fb4394e2a55aa36b379ef2b0533439d7e13583e411ae6c269c9312ebc39b64e',
    ],
  },
  team: {
    'SKILL.md': [
      'fda8a4ce74db12c343e27e036d54428553f639295d1ebb9f0c3b8c6ec5475709',
    ],
  },
};

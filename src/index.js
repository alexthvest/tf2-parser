const vdf  = require('simple-vdf');
const path = require('path'); 
const fs   = require('fs'); 
const util = require('util');

const config = JSON.parse(fs.readFileSync(path.join(path.dirname(process.execPath), 'config.json'), 'utf8')); 
let items    = [];

// const config = {
//     game_path: 'C:/Users/alext/Desktop/tf2'
// };

const itemsPath = path.join(config.game_path, 'tf/scripts/items/items_game.txt');
const langPath  = path.join(config.game_path, 'tf/resource/tf_russian.txt');

const { items_game } = vdf.parse(fs.readFileSync(itemsPath, 'utf8'));
const { lang }       = vdf.parse(fs.readFileSync(langPath, 'utf16le'));

function parsePrefab(prefab) {
    const prefabs  = prefab.split(' ');
    const paintKit = prefabs.find(prefab => prefab.startsWith('paintkit'));

    if (paintKit && paintKit != 'paintkit_base') 
        return parsePrefab(items_game.prefabs[paintKit].prefab);

    const weapon = prefabs.find(prefab => prefab.startsWith('weapon'));
    if (!weapon) return;

    prefab = items_game.prefabs[weapon];
    if (!prefab) return; 

    return parsePrefabInfo(prefab, {});
}

function parsePrefabInfo(prefab, info) {
    if (prefab.used_by_classes && !info.slot) {
        const classes = Object.keys(prefab.used_by_classes);
        if (classes.length === 1) info.class = classes[0];
        else {
            info.slot  = [];
            info.class = [];

            for (const cl of classes) {
                info.slot.push(prefab.used_by_classes[cl]);
                info.class.push(cl);
            }
        }
    }

    if (prefab.item_slot && !info.slot) info.slot = prefab.item_slot;
    if (prefab.item_name && !info.name) info.name = prefab.item_name;

    if ((!info.slot || !info.class || !info.name) && prefab.prefab)
        return parsePrefabInfo(items_game.prefabs[prefab.prefab], info);

    return info;
}

for (const id in items_game.items) {
    _id = parseInt(id);

    const item  = items_game.items[id];
    const _item = {
        id: parseInt(id),
        class: null,
        slot: null,
        name: item.item_name,
        rus_name: null
    }

    if (id === 'default') continue;
    if (item.prefab && item.prefab.includes('paintkit_tool')) continue;

    if (item.used_by_classes) {
        _item.class = Object.keys(item.used_by_classes)[0];
    }

    if (item.item_slot) {
        if (item.item_slot === 'action') continue;
        _item.slot  = item.item_slot;
    }

    if (item.prefab && (!_item.slot || !_item.class || !_item.name)) {
        const prefab = parsePrefab(item.prefab);
        if (!prefab) continue;

        _item.name  = prefab.name || _item.name;
        _item.slot  = _item.slot  || prefab.slot;
        _item.class = _item.class || prefab.class;
    }

    _item.name = _item.name.replace('#', '');

    _item.rus_name = lang.Tokens[_item.name] || item.name;
    _item.name     = lang.Tokens[`[english]${_item.name}`] || item.name;

    if (_item.slot && _item.class) items.push(_item);
}

const converted = {};

const slots = {
    primary: 0,
    secondary: 1,
    melee: 2,
    pda: 3,
    pda2: 4,
    building: 5
};

const classes = {
    scout: 2,
    soldier: 8,
    pyro: 128,
    demoman: 16,
    heavy: 64,
    engineer: 512,
    medic: 32,
    sniper: 4,
    spy: 256
};

items = items.sort((a, b) => a.id - b.id);
for (const item of items) {
    if (util.isArray(item.slot)) {
        item.slot = 1;
    } else {
        if (!(item.slot in slots)) continue;
        item.slot = slots[item.slot];
    }

    if (util.isArray(item.class)) {
        item.class = item.class.reduce((result, cl) => {
            result += classes[cl];
            return result;
        }, 0);
    } else {
        item.class = classes[item.class];
    }

    converted[item.id] = {
        slot: item.slot,
        class: item.class,
        name: item.name,
        rus_name: item.rus_name
    };
}

fs.writeFileSync('items.txt', vdf.stringify(converted, true));
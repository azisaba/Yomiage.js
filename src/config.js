const fs = require('fs');
const yaml = require('js-yaml');

const configPath = process.env.CONFIG_PATH;

/**
 * get configuration
 * @return object
 */
exports.getConfig = () => {
    //  load setting
    const data = loadYamlFile(configPath);
    if (data === undefined) {
        throw Error("Configuration is not found");
    }
    return data;
};

/**
 * save configuration
 * @param obj
 */
exports.save = (obj) => {
    const data = yaml.dump(obj);
    fs.writeFileSync(configPath, data, 'utf8');
};

/**
 * Read either .yaml file or .yml file and return either document or null
 * @param {String} filename
 * @returns {any|null} return either document or undefined, or null
 */
const loadYamlFile = (filename) => {
    const yamlText = fs.readFileSync(filename, 'utf8');

    try {
        return yaml.load(yamlText);
    } catch (e) {
        console.log(e);
        return null;
    }
}
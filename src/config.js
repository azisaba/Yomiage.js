
class Config {

    /**
     * constructor
     * @param {String} filename
     */
    constructor(filename) {
        this.filename = filename;
        //  load setting
        const data = this.loadYamlFile(this.filename);
        if (data !== undefined && data !== null){
            this.data = data
        }
    }

    /**
     * Read either .yaml file or .yml file and return either document or null
     * @param {String} filename
     * @returns {any|null} return either document or undefined, or null
     */
    loadYamlFile(filename) {
        const fs = require('fs');
        const yaml = require('js-yaml');
        const yamlText = fs.readFileSync(filename, 'utf8');
        try {
            return yaml.load(yamlText);
        } catch (e) {
            console.log(e);
            return null;
        }
    }
}

export default Config;
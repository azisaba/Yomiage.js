const fs = require('fs');
const yaml = require('js-yaml');

class Dict{
    constructor(root) {
        this.dataPath = `${root}/dict.yml`;
        //  load yaml
        let yamlText;
        if (fs.existsSync(this.dataPath)) {
            yamlText = fs.readFileSync(this.dataPath, 'utf8');
        } else {
            yamlText = "{}";
        }

        try {
            this.dictionary = yaml.load(yamlText);
        } catch (e) {
            console.log(e);
            console.log("can not read dictionary data file. exit.");
            process.exit(1);
        }
    }

    save() {
        const data = yaml.dump(this.dictionary);
        fs.writeFile(this.dataPath, data, 'utf8', (err) => {
            if (err) {
                console.error(err.message);
                console.log("can not save dictionary data. exit.");
                process.exit(1);
            }
        });
    }

    add(word, pronunciation) {
        this.dictionary[word] = pronunciation;
        this.save();    //  save
    }

    remove(word) {
        delete this.dictionary[word];
        this.save();    //  save
    }

    replace(msg) {
        //  replace
        this.dictionary.forEach((word, pronunciation) => {
            msg.replace(word, pronunciation)
        });
        return msg;
    }

}

module.exports = Dict;
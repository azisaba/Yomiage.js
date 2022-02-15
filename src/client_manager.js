
class Client_manager {

    constructor() {
        //  init map
        this.listener = null;
        this.speakers = [];
    }

    set listener(client) {
        this.listener = client;
    }

    get listener() {
        return this.listener;
    }

    set speakers(client) {
        this.speakers.push(client);
    }
    
    get speakers() {
        return this.speakers;
    }



}

module.exports = Client_manager;

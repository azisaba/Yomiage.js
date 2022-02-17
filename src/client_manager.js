
class ClientManager {

    constructor() {
        //  init map
        this._listener = null;
        this._speakers = [];
    }

    set listener(client) {
        this._listener = client;
    }

    get listener() {
        return this._listener;
    }

    set speakers(clients) {
        this._speakers = clients;
    }

    get speakers() {
        return this._speakers;
    }



}

module.exports = ClientManager;

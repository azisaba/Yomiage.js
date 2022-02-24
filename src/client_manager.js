class ClientManager {

    constructor() {
        //  init map
        this._listener = null;
        this._speakers = [];
    }

    get listener() {
        return this._listener;
    }

    set listener(client) {
        this._listener = client;
    }

    get speakers() {
        return this._speakers;
    }

    set speakers(clients) {
        this._speakers = clients;
    }


}

module.exports = ClientManager;

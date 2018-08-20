# HTTP Engine Client

Example usage:

```javascript
const EngineHttpClient = require('@vinka/engine-client');

const HOST = process.env.ES_URL || 'http://localhost:7878';
const USER = process.env.ES_USER || 'xxxx';
const PASS = process.env.ES_PASS || 'xxxx';

class EngineClient {
    constructor(host, user, pass) {
        this.http = new EngineHttpClient(host, user, pass, log);
    }

    async getRoute(id) {
        return this.http.get(`route/${id}`);
    }

    async addTrip(trip) {
        return this.http.post('trip', trip);
    }
}
```
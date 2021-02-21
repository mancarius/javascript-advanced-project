'use strict';
import aqiLegend from '../../aqi-scale-and-color-legend.json';
/**
 * 
 * @class
 * @param {string} apiKey - chiave di accesso personale
 * @author Mattia Mancarella
 */
function AqicnApi(apiKey) {
    this._apiKey = apiKey;
    this._cache = new Map();
    this._controller = null;
    this._baseUrl = 'https://api.waqi.info/feed/';

    /**
     * Invia richiesta GET verso api
     * 
     * @private
     * @function
     * @param {string} _path - parametri da inserire nel path dell'url
     * @returns {Promise}
     */
    this._apiCall = async function (path) {
        // se la chiave non è valorizzata creo l'errore
        if (this._apiKey === null) throw {
            name: "InvalidApiKey",
            message: "'null' isn't a valid key"
        };

        if (this._controller) this._controller.abort();

        this._controller = new AbortController();

        const apiKey = `token=${this._apiKey}`;
        let apiUrl = [this._baseUrl, path, '/', '?', apiKey].join('');
        let response = [];

        try {
            // codifico url
            apiUrl = encodeURI(apiUrl);
            // se ho già il risultato di questa query in cache lo ritorno
            if (this._cache.has(apiUrl))
                response = this._cache.get(apiUrl);
            else {
                // altrimenti invio chiamata GET all'api
                response = await fetch(apiUrl, {
                    signal: this._controller.signal
                });
                // salvo risposta nella cache
                this._cache.set(apiUrl, response);
            }
            if (response.ok) return await response.clone().json();
            else {
                throw {
                    name: "AqicnError",
                    message: `Richiesta fallita (code: ${response.status})`
                }
            }
        } catch (e) {
            // questo errore viene chiamato ogni volta che il controller annulla la chiamata
            if (e instanceof DOMException) {
                return [];
            }
            throw e;
        }
    };

    /**
     * date latitudine e longitudine, ritorna le rilevazioni della stazione più vicina
     * 
     * @function
     * @param  {(string|number)} lat - latitudine
     * @param  {(string|number)} lng - longitudine
     * @returns {Array}
     */
    this.geolocalizedFeed = async function(lat, lng) {

        const path = `geo:${lat};${lng}`;
        let result = [];
        
        try {
            result = await this._apiCall(path);
        } catch (e) {
            throw e;
        }

        if (result.status === 'ok') {
            // misuro distanza tra coordinate per ricavare precisione
            const [station_lat, station_lng] = result.data.city.geo;
            result.data.precision = this._calcCrow(lat, lng, station_lat, station_lng);
            result.data.legend = this._getLegend(result.data.aqi);
            return result.data;
        }
        else 
            throw {name:'AqicnApiError', message: result.data};
    }

    /**
     * This function takes in latitude and longitude of two location and returns the distance between them as the crow flies( in km)
     * 
     * @private
     * @function
     * @param {number} lat1 
     * @param {number} lon1 
     * @param {number} lat2 
     * @param {number} lon2 
     * @returns {number}
     */
    this._calcCrow = function (lat1, lon1, lat2, lon2) {
        var R = 6371; // km
        var dLat = this._toRad(lat2 - lat1);
        var dLon = this._toRad(lon2 - lon1);
        var lat1 = this._toRad(lat1);
        var lat2 = this._toRad(lat2);

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return d;
    }


    /**
     * Converts numeric degrees to radians
     * 
     * @private
     * @function
     * @param {number} Value 
     * @returns {number}
     */
    this._toRad = function(Value) {
        return Value * Math.PI / 180;
    }


    /**
     * data un aqi, ritorna la relativa legenda
     * 
     * @function
     * @param {number} aqi - Air Quality Index
     */
    this._getLegend = function (aqi) {
        let legend = {};

        for (let item of aqiLegend) {
            if (item['aqi-min'] < aqi)
                legend = item;
            else
                return legend;
        }
    }
}

export default AqicnApi;
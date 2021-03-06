'use strict';
import HereApi from './modules/HereApi'
import { ErrorHandler } from './modules/ErrorHandler';
import SnackBar from './modules/SnackBar';
import AqicnApi from './modules/AqicnApi';


// importo apikey nella libreria HereApi
HereApi.apiKey = process.env.HERE_APY_KEY;

// importo apikey nella libreria aqicnApiKey
const aqicnApiKey = process.env.AQICN_API_KEY;
const aqicn = new AqicnApi(aqicnApiKey);

// variabile globale
let SEARCH_RESULTS = [];

// focus sul campo di riceca al caricamento della pagina
document.getElementById('InputLocation').focus();


/**
 * accetta 2 coordinate e se sono in formato corretto ritorna true, altrimenti false
 * 
 * @function
 * @param  {(string|number)} args - accetta 2 parametri (longitudine e latitudine)
 * @return {boolean}
 */

function checkCoords(latitude, longitude) {
    const pattern = /-?[0-9]{1,3}[.][0-9]+/;
    return pattern.test(latitude) && pattern.test(longitude);
}


/**
 * riduce o estende genitore .search-container dell'elemento ricevuto
 * 
 * @function
 * @param {HTMLElement} elm - Elemento figlio di .search-container
 * @param {boolean} state - true: minimizza contenitore, false: estende contenitore
 */

function searchMinimize(elm, state = true) {
    const aqiFeed = document.querySelector('.aqi-feed__container');
    if (state) { // minimizzo form di ricerca
        elm?.closest('.search-container').classList.add('minimize');
        aqiFeed.classList.add('active');
    }
    else {
        elm?.closest('.search-container').classList.remove('minimize');
        aqiFeed.classList.remove('active');
    }
}


/**
 * Aggiorno DOM con i dati ricevuti
 * 
 * @param {Object} address - Indirizzo ricevuto da here.com
 * @param {Object} feed - Dati aqi ricevuti da aqicn.com
 */

function feedPrint(address, feed) {
    const container = document.querySelector('.aqi-feed__container');
    const { city, county, state, countryCode } = address;
    let label = feed.legend.label?.split(' ') ?? [];
    // scrivi indirizzo
    container.querySelector('.aqi-feed__address').innerHTML = `${city}<small>${[county, state, countryCode].filter(i => i).join(', ')}</small>`;
    container.querySelector('.aqi-feed__accuracy .last-update span').textContent = feed.time.s.split(' ')[0];
    container.querySelector('.aqi-feed__accuracy .precision span').textContent = feed.precision < 50 ? 'high' : feed.precision < 150 ? 'medium' : 'low';
    container.querySelector('.aqi-feed__aqi').dataset.aqiLevel = feed.legend.aqi_min;
    container.querySelector('.aqi-feed__aqi .aqi').textContent = feed.aqi;
    container.querySelector('.aqi-feed__label .air-pollution').innerHTML = `${label.shift()} ${label.length ? `<small> ${label.join(' ')} </small>` : ``}`;
    container.querySelector('.aqi-feed__details').textContent = feed.legend.details;
    container.querySelector('.aqi-feed__footer .station-city').textContent = `"${feed.city.name}"`;
    container.querySelector('.aqi-feed__footer .station-distance').textContent = Math.round(feed.precision);
    container.querySelector('.aqi-feed__footer .required-city').textContent = city;
    // rendo visibile il contenitore (serve per la prima ricerca da mobile)
    container.classList.add('compiled');
    searchMinimize(document.getElementById('InputLocation'));
}


/**
 * Popola lista suggerimenti ricerca (.tips-list) sulla base della stringa ricevuta
 * 
 * @param {Event} e 
 */

async function autocomplete(e) {
    const this_ = e.target;
    const autocompleteId = this_.dataset.list;
    const query = this_.value;

    // rimuovo eventuali valori da location-id e coords
    SEARCH_RESULTS = [];

    try {
        let locations = await HereApi.autocomplete(query, 6, 'city');
        // salvo risultati
        SEARCH_RESULTS = locations;
        // stampa risultati
        // creo frammento
        let $list = $('<ul />', {
            id: autocompleteId,
            class: 'tips-list'
        });
        // appendo risultati al frammento
        if (locations.length > 0) {
            for (let location of locations) {
                $list.append(`<li class="tip" id="${location.id}" tabindex="0"><span>${location.address.city}</span> <small>${location.address.countryCode}</small></li>`);
            }
            // rendo visibile lista
            $(this_).parents('.search-group').addClass('autocomplete');
        } else {
            // nascondo visibile lista
            $(this_).parents('.search-group').removeClass('autocomplete');
        }
        // sostituisco precedente lista con nuovo frmmento
        $(`#${autocompleteId}`).replaceWith($list);
    } catch (e) {
        new ErrorHandler(e);
    }
}


/**
 * Richiede aqi del primo indirizzo contenuto in SEARCH_RESULTS, altrimenti cerca indirizzo corrispondente a chiave di ricerca e poi richiede aqi.Al termine richiama feedPrint per stampare i risultati
 * 
 * @param {HTMLElement} this_ 
 */

async function getAqi(this_) {
    const searchField = this_.querySelector('[type="search"]');
    const searchKey = searchField.value.toLowerCase();
    // rimuovo focus dal campo di ricerca
    searchField.blur();

    const { lat, lng } = SEARCH_RESULTS?.[0]?.position ?? { lat: null, lng: null };

    // se non ci sono le coordinate faccio un tentativo col contenuto del campo di ricerca (se valorizzato)
    if (!checkCoords(lat, lng)) {
        let location = [];
        if (SEARCH_RESULTS.length) {
            try {
                location = await HereApi.lookupByID(SEARCH_RESULTS[0].id);
            } catch (err) {
                new ErrorHandler(err);
            }
        } else if (searchKey.length > 1) {
            try {
                // invio contenuto campo supponendo sia il nome di una città (o parte di esso)
                location = await HereApi.geocode(searchKey, 1);
            } catch (err) {
                new ErrorHandler(err);
            }
        } else {
            new ErrorHandler('Please, give me a valid city name to search for', false);
            searchMinimize(this_, false);
            searchField.focus();
            return;
        }
        // prendo coordinate
        const { lat, lng } = location?.[0]?.position ?? location?.position ?? { lat: null, lng: null };
        // se le coordinate non sono valide esco
        if (!checkCoords(lat, lng)) {
            new ErrorHandler(`I'm sorry, but i can't find any city named '${searchKey}'. Try with another name.`, false);
            searchMinimize(this_, false);
            return;
        }
        // salvo dati indirizzo
        SEARCH_RESULTS = location.length ? location : [location];
        // sovrascrivo valore campo di ricerca nel caso in cui il nome della location ritornata non coincida con quella scritta
        searchField.value = SEARCH_RESULTS?.[0].address.city;
        // richiamo submit (chiamata ricorsiva)
        getAqi(e);
    }
    // invio richiesta ad api di Aqicn
    else {
        try {
            const aqicnFeed = await aqicn.geolocalizedFeed(lat, lng);
            // stampo risultati nel DOM
            feedPrint(SEARCH_RESULTS[0].address, aqicnFeed);
        } catch (err) {
            new ErrorHandler(err);
        }
    }
}


/**
 * Riceve suggerimento selezionato dall'utente, ricava coordinate e richiama submit
 * 
 * @param {Event} e
 */

async function tip2coords (e) {
    const this_ = e.currentTarget;
    const locationID = this_.id;
    let location = SEARCH_RESULTS.filter(o => o.id === locationID);
    const cityName = location?.[0].address?.city;
    const container = this_.closest('.tips-list');
    const searchField = document.querySelector(`[data-list="${container.id}"]`);

    if (cityName == 'undefined') {
        new ErrorHandler('Unfortunately, I received invalid data. Please try again');
        searchMinimize(this_, false);
        return;
    }

    // minimizzo form di ricerca
    searchMinimize(this_);

    searchField.value = cityName;

    $(this_).parents('.search-group').removeClass('autocomplete');

    // ora carico le coordinate della selezione
    try {
        location = await HereApi.lookupByID(locationID);
        // prendo le coordinate
        const { lat, lng } = location?.position ?? { lat: null, lng: null };
        // verifico coordinate
        if (!checkCoords(lat, lng)) {
            new ErrorHandler('Unfortunately, I received invalid data. Please try again');
            searchMinimize(this_, false);
            return;
        }
        // salvo risultato
        SEARCH_RESULTS = [location];
        //simulo submit
        $('#locationSearchForm .submit').trigger('click');
    } catch (e) {
        searchMinimize(this_, false);
        new ErrorHandler(e);
    }
}


/**
 * Se disponibili, ricava coordinate del browser e richiede indirizzo corrispondente a here.com, lo salva in SEARCH_RESULTS e richiama submit.
 * 
 * @param {HTMLElement} this_ 
 */

async function coords2address(e) {
    // verifico se la geolocalizzazione è presente
    if ("geolocation" in navigator) {
    /* la geolocalizzazione è disponibile */
        const this_ = e.target;
        searchMinimize(this_);
        // ricavo coordinate da inviare
        navigator.geolocation.getCurrentPosition(async function (position) {

            const { latitude, longitude } = position.coords;

            if (!checkCoords(latitude, longitude)) {
                new ErrorHandler(`I received invalid coordinates. Please try again`, false);
                searchMinimize(this_, false);
                return;
            }

            let location = null;

            // ricavo città da api
            try {
                location = await HereApi.reverseGeocode(latitude, longitude);
            } catch (e) {
                new ErrorHandler(e);
                searchMinimize(this_);
                return;
            }

            // salvo indirizzo
            SEARCH_RESULTS = [location];
            // imposto città ricevuta come valore del campo di ricerca         
            document.getElementById('InputLocation').value = location.address.city;
            //simulo submit
            $('#locationSearchForm .submit').trigger('click');
        },
        e => {
            new SnackBar({
                message: 'Geolocation not available'
            });
        });
    } else {
        /* la geolocalizzazione NON È disponibile */
        new SnackBar({
            message: 'Geolocation not available'
        });
    }
}



/////////////////////////////////////////////////
//
//
//  EVENTI
//
//
/////////////////////////////////////////////////



//
//  FOCUSIN / FOCUSOUT 
//
//  @ #InputLocation
//  
//  Gestisce animazione campo di ricerca (no mobile)
//

$('#InputLocation').on('focusin focusout', e => {
    const this_ = e.target;
    const value = this_.value;
    const { lat, lng } = SEARCH_RESULTS?.[0]?.position ?? { lat: null, lng: null };

    switch (e.type) {
        case 'focusin':
            this_.select();
            searchMinimize(this_, false);
            break;
        case 'focusout':
            if (value.length > 0 && checkCoords(lat, lng)) {
                // leggero delay per permettere di eliminare il contenuto dalla X del campo
                setTimeout(() => {
                    searchMinimize(this_);
                }, 200);
            } else if (value.length === 0) {
                searchMinimize(this_, false);
            }
            break;
        default:
    }
})



//
//  KEYUP
//
//  @ #InputLocation
//  
//  Ascolta rilascio tasti durante scrittura nel campo di ricerca per attivare completamento automatico
//

document.getElementById('InputLocation').addEventListener('keyup', autocomplete);



//
//  SUBMIT
//
//  @ #locationSearchForm
//
//  Scarica i dati da aqicn usando le coordinate. 
//  Se le coordinate non sono ancora state ricavate, 
//  le cerca inviando il testo nel campo di ricerca a here.com
//  che risponderà con la località corrispondente.
//

document.getElementById('locationSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    getAqi(e.target);
})



//
//  CLICK
//
//  @ .tips-list .tip
//  
//  Cattura selezione della città tra quelle suggerite durante la ricerca
//  e richiama evento SUBMIT di #locationSearchForm per caricare i dati aqicn della stazione più vicina
//

$(document).on('click', '.tips-list .tip', tip2coords);



//
//  CLICK
//
//  @ #inputGeolocation
//  
//  Avvia richiesta di coordinate gps locali al browser e se supportato e concesso 
//  richiama evento SUBMIT di #locationSearchForm per caricare i dati aqicn della stazione più vicina
//

document.getElementById('inputGeolocation').addEventListener('click', coords2address);
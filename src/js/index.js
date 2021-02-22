'use strict';
import HereApi from './modules/HereApi'
import { ErrorHandler } from './modules/ErrorHandler';
import SnackBar from './modules/SnackBar';
import AqicnApi from './modules/AqicnApi';

HereApi.apiKey = process.env.HERE_APY_KEY;
const aqicnApiKey = process.env.AQICN_API_KEY;
const aqicn = new AqicnApi(aqicnApiKey);





/**
 * accetta 2 coordinate e se sono in formato corretto ritorna true, altrimenti false
 * 
 * @function
 * @param  {(string|number)} args - accetta 2 parametri (longitudine e latitudine)
 * @return {boolean}
 */
function checkCoords(...args) {
    const [latitude, longitude] = args;
    const pattern = /-?[0-9]{1,3}[.][0-9]+/;
    return pattern.test(latitude) && pattern.test(longitude);
}

/**
 * riduce o estende contenitore .search-container genitore dell'elemento ricevuto
 * 
 * @param {HTMLElement} elm - Elemento del dom figlio di .search-container
 * @param {boolena} state - true: minimizza contenitore, false: estende contenitore
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
 * Aggiorno DOM con risultati del feed
 * 
 * @param {string} address
 * @param {Object} feed 
 */
function feedPrint(address, feed) {
    const container = document.querySelector('.aqi-feed__container');
    address = address.split(',');
    let city = address.shift();
    let label = feed.legend.label.split(' ');
    // scrivi indirizzo
    container.querySelector('.aqi-feed__address').innerHTML = `${city}<small>${address.join(', ')}</small>`;
    container.querySelector('.aqi-feed__accuracy .last-update span').textContent = feed.time.s.split(' ')[0];
    container.querySelector('.aqi-feed__accuracy .precision span').textContent = feed.precision < 50 ? 'high' : feed.precision < 150 ? 'medium' : 'low';
    container.querySelector('.aqi-feed__aqi').dataset.aqiLevel = feed.legend.aqi_min;
    container.querySelector('.aqi-feed__aqi .aqi').textContent = feed.aqi;
    container.querySelector('.aqi-feed__label .air-pollution').innerHTML = `${label.shift()} ${label.length ? `<small> ${label.join(' ')} </small>` : ``}`;
    container.querySelector('.aqi-feed__details').textContent = feed.legend.details;
    container.querySelector('.aqi-feed__footer .station-city').textContent = `"${feed.city.name}"`;
    container.querySelector('.aqi-feed__footer .station-distance').textContent = Math.round(feed.precision);
    container.querySelector('.aqi-feed__footer .required-city').textContent = city;
    // la pirma volta rendo visibile il contenitore
    container.style.display = 'grid';
}


$('#InputLocation').on('focusin focusout', e => {
    const this_ = e.target;
    const coords = this_.dataset.coords.split(',');

    switch (e.type) {
        case 'focusin':
            searchMinimize(this_, false);
            break;
        case 'focusout':
            if (this_.value.length > 0 && checkCoords(...coords)) {
                // leggero delay per permettere di eliminare il contenuto dalla X del campo
                setTimeout(() => {
                    searchMinimize(this_);
                }, 200);
            }
            else if (this_.value.length === 0) {
                searchMinimize(this_, false);
            }
            break;
        default:
    }
})


// ascolto pressione tasti nel campo di ricerca
document.getElementById('InputLocation').addEventListener('keyup', async e => {
    const this_ = e.target;
    const autocompleteId = this_.dataset.list;

    const query = e.target.value;

    // rimuovo eventuali valori da location-id e coords
    this_.dataset.id = "";
    this_.dataset.coords = "";

    try {
        let locations = await HereApi.autocomplete(query, 5, 'city');
        // stampa risultati
        // creo frammento
        let $list = $('<ul />', {
            id: autocompleteId,
            class: 'suggested-list'
        });
        // appendo risultati al frammento
        if (locations.length > 0) {
            for (let location of locations) {
                $list.append(`<li class="item" data-id="${location.id}" data-city="${location.address.city}" tabindex="0"><span>${location.address.city}</span> <small>${location.address.countryCode}</small></li>`);
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
});

// ascolto invio form

$(document).on('submit', '#locationSearchForm', (e) => {
    e.preventDefault();

    async function submit(e) {
        const this_ = e.target;
        const searchField = this_.querySelector('[type="search"]');
        // rimuovo focus dal campo di ricerca
        searchField.blur();

        searchMinimize(this_);

        if (typeof searchField !== 'object') {
            new ErrorHandler(new TypeError(`'${searchField}' non è un selettore valido`));
            return;
        };

        const [lat, lng] = searchField.dataset?.coords.split(',');

        // se non ci sono le coordinate faccio un tentativo col contenuto di campo di ricerca se è valorizzato
        if (!checkCoords(lat, lng)) {
            if (searchField.value.length > 1) {
                try {
                    // invio contenuto campo supponendo sia il nome di una città (o parte di esso)
                    const location = await HereApi.geocode(searchField.value.toLowerCase(), 1);
                    // prendo coordinate
                    const { lat, lng } = location?.[0]?.position ?? { lat: null, lng: null };
                    // se le coordinate non sono valide esco
                    if (!checkCoords(lat, lng)) {
                        new ErrorHandler(`Non riesco a trovare nessuna città che corrisponda a '${searchField.value}'`, false);
                        searchMinimize(this_, false);
                        return;
                    }
                    // salvo coordinte
                    searchField.dataset.coords = `${lat},${lng}`;
                    // salvo indirizzo
                    searchField.dataset.address = location[0].address.city + ',' + (location[0].address?.county + ',' ?? '') + (location[0].address?.state + ',' ?? '') + location[0].address.countryCode;
                    // sovrascrivo valore campo di ricerca nel caso in cui il nome della location ritornata non coincida con quella scritta
                    searchField.value = location[0].address?.city;
                    // richiamo submit (chiamata ricorsiva)
                    submit(e);
                } catch (err) {
                    new ErrorHandler(err);
                }
            }
            else {
                new ErrorHandler('Non riesco a trovare un indirizzo valido', false);
                searchMinimize(this_, false);
                return;
            }
        }
        // invio richiesta ad api di Aqicn
        else {
            try {
                const aqicnFeed = await aqicn.geolocalizedFeed(lat, lng);
                // stampo risultati nel DOM
                feedPrint(searchField.dataset.address, aqicnFeed);
                searchMinimize(this_);
            } catch (err) {
                new ErrorHandler(err);
                searchMinimize(this_, false);
                return;
            }
        }
    }

    submit(e);
})

// ascolto selezione città da suggerimenti
$(document).on('click', '.suggested-list .item', async el => {
    const this_ = el.currentTarget;
    const locationID = this_.dataset.id;
    const cityName = this_.dataset.city;
    const container = this_.closest('.suggested-list');
    const searchField = document.querySelector(`[data-list="${container.id}"]`);

    // minimizzo form di ricerca
    searchMinimize(this_);

    searchField.value = cityName;
    searchField.dataset.locationId = locationID;
    $(this_).parents('.search-group').removeClass('autocomplete');

    // ora carico le coordinate della selezione
    try {
        const location = await HereApi.lookupByID(locationID);
        // prendo le coordinate
        const { lat, lng } = location?.position ?? { lat: null, lng: null };
        // verifico coordinate
        if (!checkCoords(lat, lng)) {
            new ErrorHandler('Non ho ricevuto coordinate valide');
            searchMinimize(this_, false);
            return;
        }
        // salvo coordinate
        searchField.dataset.coords = `${lat},${lng}`;
        // salvo indirizzo
        searchField.dataset.address = location.address.city + ',' + (location.address?.county + ',' ?? '')  + (location.address?.state + ',' ?? '') + location.address.countryCode;
        //simulo submit
        $('#locationSearchForm .submit').trigger('click');
    } catch (e) {
        searchMinimize(this_, false);
        new ErrorHandler(e);
    }
});

// ascolto pressione bottone per geolocalizzazione
document.getElementById('inputGeolocation').addEventListener('click', e => {
    // verifico se la geolocalizzazione è presente, altrimenti disattivo il bottone
    if ("geolocation" in navigator) {
    /* la geolocalizzazione è disponibile */
        searchMinimize(e.target);
        // ricavo coordinate da inviare
        navigator.geolocation.getCurrentPosition(async function (position) {
            const {
                latitude,
                longitude
            } = position.coords;
            if (!checkCoords(latitude, longitude)) {
                new ErrorHandler(`'${latitude},${longitude}' non sono coordinate valide`, false);
                searchMinimize(e.target, false);
                return;
            }
            let location = null;
            // ricavo Luogo da api
            try {
                location = await HereApi.reverseGeocode(latitude, longitude);
            } catch (e) {
                new ErrorHandler(e);
                searchMinimize(e.target);
                return;
            }

            // salvo le coordinate in data-coords dell'elemento #InputLocation
            let searchField = document.getElementById('InputLocation');
            // salvo indirizzo
            searchField.dataset.address = location.address.city + ',' + location.address.county + ',' + location.address.state + ',' + location.address.countryCode;
            searchField.dataset.id = location.id;
            searchField.value = location.address.city;
            searchField.dataset.coords = `${latitude},${longitude}`;
            //simulo submit
            $('#locationSearchForm .submit').trigger('click');
        });
    } else {
        /* la geolocalizzazione NON È disponibile */
        new SnackBar({ message: 'Geolocalizzione non disponibile' });
    }
});
'use strict';
import Here from './modules/Here'
import { ErrorHandler } from './modules/ErrorHandler';
import SnackBar from './modules/SnackBar';

Here.apiKey = process.env.HERE_APY_KEY;

function checkCoords(...args) {
    const [latitude, longitude] = args;
    const pattern = /-?[0-9]{1,3}[.][0-9]+/;
    return pattern.test(latitude) && pattern.test(longitude);
}

// ascolto pressione tasti nel campo di ricerca
document.getElementById('InputLocation').addEventListener('keyup', async e => {
    const elm = e.target;
    const autocompleteId = elm.dataset.list;

    const query = e.target.value;

    // rimuovo eventuali valori da location-id e coords
    elm.dataset.locationId = "";
    elm.dataset.coords = "";

    try {
        let locations = await Here.autocomplete(query, 5, 'city');
        // stampa risultati
        // creo frammento
        let $list = $('<ul />', {
            id: autocompleteId,
            class: 'suggested-list'
        });
        // appendo risultati al frammento
        if (locations.length > 0) {
            for (let location of locations) {
                $list.append(`<li class="item" data-id="${location.id}" data-city="${location.address.city}" tabindex="0">${location.address.city} <small>${location.address.countryCode}</small></li>`);
            }
            // rendo visibile lista
            $(elm).parents('.search-group').addClass('autocomplete');
        } else {
            // nascondo visibile lista
            $(elm).parents('.search-group').removeClass('autocomplete');
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
        const form = e.target;
        const searchField = form.querySelector('[type="search"]');

        if (typeof searchField !== 'object') {
            new ErrorHandler(new TypeError(`'${searchField}' non è un selettore valido`));
            return;
        };

        const [lat, lng] = searchField.dataset?.coords.split(',');

        // se non ci sono le coordinate faccio un tentativo col contenuto di campo di ricerca se è valorizzato
        if (!checkCoords(lat, lng)) {
            if (searchField.value.length > 1) {
                try {
                    // invio contenuto campo supponendo sia un indirizzo
                    const location = await Here.geocode(searchField.value.toLowerCase(), 1);
                    console.log(location)
                    // prendo coordinate
                    const { lat, lng } = location?.[0]?.position;
                    // se le coordinate non sono valide esco
                    if (!checkCoords(lat, lng)) {
                        new ErrorHandler('Non riesco a trovare nessuna città che corrisponda a '+ searchField.value, false);
                        return;
                    }
                    // le salvo
                    searchField.dataset.coords = `${lat},${lng}`;
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
                return;
            }
        }

        new SnackBar({ message: 'Coordinate inviate!' , status: 'success'});
    }

    submit(e);
})

// ascolto selezione città da suggerimenti
$(document).on('click', '.suggested-list .item', async el => {
    const elm = el.currentTarget;
    const locationID = elm.dataset.id;
    const cityName = elm.dataset.city;
    const container = elm.closest('.suggested-list');
    const searchField = document.querySelector(`[data-list="${container.id}"]`);

    searchField.value = cityName;
    searchField.dataset.locationId = locationID;
    $(elm).parents('.search-group').removeClass('autocomplete');

    // ora carico le coordinate della selezione
    try {
        const location = await Here.lookupByID(locationID);
        // prendo le coordinate
        const { lat, lng } = location?.position;
        // verifico coordinate
        if (!checkCoords(lat, lng)) {
            new ErrorHandler('Non ho ricevuto coordinate valide');
            return;
        }
        // le salvo
        searchField.dataset.coords = `${lat},${lng}`;
        //simulo submit
        $('#locationSearchForm [type="submit"]').trigger('click');
    } catch (e) {
        new ErrorHandler(e);
    }
});

// ascolto pressione bottone per geolocalizzazione
document.getElementById('inputGeolocation').addEventListener('click', e => {
    // verifico se la geolocalizzazione è presente, altrimenti disattivo il bottone
    if ("geolocation" in navigator) {
        /* la geolocalizzazione è disponibile */
        // ricavo coordinate da inviare
        navigator.geolocation.getCurrentPosition(async function (position) {
            const {
                latitude,
                longitude
            } = position.coords;
            if (!checkCoords(latitude, longitude)) {
                console.warn(latitude, longitude, 'non sono coordinate valide');
                return;
            }
            let location = null;
            // ricavo Luogo da api
            try {
                location = await Here.reverseGeocode(latitude, longitude);
            } catch (e) {
                new ErrorHandler(e);
                return;
            }

            // salvo le coordinate in data-coords dell'elemento #InputLocation
            let searchField = document.getElementById('InputLocation');
            searchField.dataset.id = location.id;
            searchField.value = location.address.city;
            searchField.dataset.coords = `${latitude},${longitude}`;
            //simulo submit
            $('#locationSearchForm [type="submit"]').trigger('click');
        });
    } else {
        /* la geolocalizzazione NON È disponibile */
        new SnackBar({ message: 'Geolocalizzione non disponibile' });
    }
});
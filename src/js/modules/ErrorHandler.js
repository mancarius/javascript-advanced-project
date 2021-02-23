'use strict';
import SnackBar from './SnackBar';

/**
 * riceve un oggetto di tipo error
 *
 * @param {Array} error
 * @param {string} message
 * @param {boolean} is_error - true -> error, false -> warning
 */
export class ErrorHandler {
    constructor(...args) {
        // valori di default
        this.is_error = true;
        this.message = 'Ops, something gone wrong';
        this.error = null;
        // assegno argomenti a variabili (se esistono)
        args.map(arg => {
            switch (typeof arg) {
                case 'object':
                    this.error = arg;
                    break;
                case 'string':
                    this.message = arg;
                    break;
                case 'boolean':
                    this.is_error = arg;
                    break;
                default:
                    break;
            }
        });
        // se errore personalizzato, creo nuovo errore
        this.error = this.error === null ? new Error(this.message) : this.error;
        this.switchType();
        this.show();
    }

    switchType() {
        if (!this.is_error)
            console.warn(this.error);
        else
            console.error(this.error);
    }

    show() {
        // show message in snackbar
        new SnackBar({
            message: this.message,
            status: this.is_error ? 'error' : 'warning'
        });
    }
}

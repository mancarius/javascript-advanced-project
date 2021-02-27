# Javascript Advanced Project

![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/mancarius/javascript-advanced-project?style=plastic)

<br/>

![project screen shot](https://github.com/mancarius/javascript-advanced-project/blob/main/images/screenshot.png)

<br/>

Simple javascript project that allows to obtain information on the pollution levels of a city by searching by city name or GPS position of the device.
([View demo](https://www.mattiamancarella.com/works/javascript/javascript-advanced-project/))

<br/>

### Built With

* [jQuery](https://jquery.com)
* [Lodash](https://lodash.com)
* [js-snakbar](https://www.cssscript.com/snackbar-toast-notification/)

<br/>

## Installation

Just fork and install packages with <code>npm</code> running the following command in the content folder.

```bash
npm install
```

<br/>

## Usage

In order to access the api services, you need to get your own api keys respectivelly from [aqicn](https://aqicn.org/data-platform/token/#/) and [here](https://developer.here.com/).
Then save your keys in your <code>.env</code> file in the root directory
```.env
HERE_APY_KEY=your-api-key
AQICN_API_KEY=your-api-key
```

<br/>

## Credits

* Air quality data is provided by [aqicn.com](https://www.aqicn.com). </br>
* Address search is provided by [here.com](https://www.here.com)

<br/>

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

<br/>

## License

[MIT](https://choosealicense.com/licenses/mit/)
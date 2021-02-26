# javascript-advanced-project

Simple javascript project that allows to obtain information on the pollution levels of a city by searching by city name or GPS position of the device.

![page screenshot](https://github.com/mancarius/javascript-advanced-project/blob/main/images/screenshot.png)

[Demo](https://www.mattiamancarella.com/works/javascript/javascript-advanced-project/)

## Installation

Just fork and install packages with <code>npm</code> running the following command in the content folder.

```bash
npm install
```

## Usage

In order to access the api services, you need to get your own api keys respectivelly from [aqicn](https://aqicn.org/data-platform/token/#/) and [here](https://developer.here.com/).
Then save your keys in your <code>.env</code> file in the root directory
```.env
HERE_APY_KEY=your-api-key
AQICN_API_KEY=your-api-key
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Credits

Air quality data is provided by [aqicn.com](https://www.aqicn.com), while the city search leverages the [here.com](https://www.here.com) API
## License

[MIT](https://choosealicense.com/licenses/mit/)
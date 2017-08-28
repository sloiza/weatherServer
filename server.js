// BASE SETUP
// =============================================================================

// call the packages we need
var express    	= require('express');        // call express
var app        	= express();                 // define our app using express
var bodyParser 	= require('body-parser');
var request 	= require('request');
var moment 		= require('moment-timezone');
var async 		= require('async');
var config 		= require('./config');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router
// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    console.log(req.method+' '+req.url);
    next(); // make sure we go to the next routes and don't stop here
});


router.route('/weather/:country_id')
    .get(function(req, res) {
		var query = {
			id: req.params.country_id,
			APPID: config.apiKey,
			units: 'metric' 
		};

		request({url:config.url, qs:query}, function(err, response, body) {
			if(err) { 
				console.log("error");
				console.log(err); 
				res.json({
					statusCode: 500,
					data: err
				}); 
			}

			var body = JSON.parse(body);
			if (body.cod != undefined && body.cod == '404') {
				res.json({
					statusCode: 404,
					data: body.message
				}); 	
			} else {
				async.waterfall([
				    function parseIsNight(callback) {
				    	var isNight;
				    	parseDate(body.coord.lat, body.coord.lon, function (isNight) {
				    		parseWeatherCondition(body.weather[0].main, function(weatherCond) {
				    			callback(null, isNight, weatherCond);
				    		})
				    	});
				    },
				    function selectImage(isNight, weatherCond, callbackImage) {
				    	getImageWeather(isNight, weatherCond, body.main.temp, function(image) {
				    		callbackImage(null, isNight, weatherCond, image);
				    	})
				    },
				    function parseQuery(isNight, weatherCond, image, callbackParseQuery) {
				    	var dataResponse = {
							id: body.id,
							temperature: Math.round(body.main.temp),
							pressure: Math.round(body.main.pressure),
							city: body.name,
							country: body.sys.country,
							weatherCondition: weatherCond,
							isNight: isNight,
							imageCond: image
						};
						res.json({
							statusCode: response.statusCode,
							data: dataResponse
						});
						callbackParseQuery(null);
				    }
				], function (error) {
				    if (error) {
				    	res.json({
							statusCode: 500,
							data: error
						}); 
				    }
				});
			}

			
		});
    });

// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);

function parseDate(lat, long, callback) {
	getTimeZone(lat,long, function(timeZone) {
		var date = moment().tz(timeZone).format('HH');		
		//valida si esta entre 9-18 hs
		if (date > 9 && date < 18) {
			return callback(false);
		} else {
			return callback(true);
		}
	});
}

function parseWeatherCondition(weatherCondition, callback) {
	if (weatherCondition == 'Thunderstorm' || weatherCondition == 'Drizzle' || 
		weatherCondition == 'Rain' || weatherCondition == 'Snow') {
		return callback('rainy');
	} else if (weatherCondition == 'Atmosphere' || weatherCondition == 'Clouds') {
		return callback('cloudy');
	} else if (weatherCondition == 'Clear') {
		return callback('sunny');
	}
}

function getTimeZone(lat, long, callback) {
	var tm = Date.now().toString();
	tm = tm.slice(0, -3);
	var query = {
		location: lat+','+long,
		timestamp: tm,
		key: config.googleApiKey
	};

	request({url:config.googleUrl, qs:query}, function(err, response, body) {
			if(err) { 
				console.log(err); 
				callback('')
			}
			var body = JSON.parse(body);
			callback(body.timeZoneId);
		});
}

function getImageWeather(isNight, weatherCond, temperature, callback) {
	if (!isNight && weatherCond == 'sunny' && temperature > 20) {
		return callback(1);
	} else if (!isNight && weatherCond == 'cloudy' && temperature > 20) {
		return callback(2);
	} else if (!isNight && weatherCond == 'rainy' && temperature > 20) {
		return callback(3);
	}  else if (!isNight && weatherCond == 'sunny' && temperature > 8 && temperature < 20) {
		return callback(4);
	}  else if (!isNight && weatherCond == 'cloudy' && temperature > 8 && temperature < 20) {
		return callback(5);
	}  else if (!isNight && weatherCond == 'rainy' && temperature > 8 && temperature < 20) {
		return callback(6);
	}  else if (!isNight && weatherCond == 'sunny' && temperature < 8) {
		return callback(7);
	}  else if (!isNight && weatherCond == 'cloudy' && temperature <= 8) {
		return callback(8);
	}  else if (!isNight && weatherCond == 'rainy' && temperature <= 8) {
		return callback(9);
	}  else if (isNight && (weatherCond == 'sunny' || weatherCond == 'cloudy')) {
		return callback(10);
	}  else if (isNight && weatherCond == 'rainy') {
		return callback(11);
	}

}

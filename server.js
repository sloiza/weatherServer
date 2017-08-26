// BASE SETUP
// =============================================================================

// call the packages we need
var express    	= require('express');        // call express
var app        	= express();                 // define our app using express
var bodyParser 	= require('body-parser');
var request 	= require('request');
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
				console.log(err); 
				res.json({
					statusCode: 500,
					data: err
				}); 
			}
			var body = JSON.parse(body);
			var dataResponse = {
				id: body.id,
				temperature: Math.round(body.main.temp),
				pressure: Math.round(body.main.pressure),
				city: body.name,
				weatherCondition: body.weather[0].main
			};
			res.json({
				statusCode: response.statusCode,
				data: dataResponse
			});
		});
    });

// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
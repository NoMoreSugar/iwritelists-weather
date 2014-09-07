var fcas=require("forecast");
var cities=require("cities");
var fs=require("fs");

var forecast, getDate;

var m = {};
m.toCelsius = function(c){
  return Math.floor((5/9)*(c-32));
}
m.dateFormat = function(d){
  return getDate(d);
}
m.getForecast = function(zip, msg){
  var city=cities.zip_lookup(zip);
  if( ! city ){
    msg.reply("That isn't a valid United States ZIP code.");
    return;
  }
  forecast.get([city.latitude, city.longitude], function(err, weather){
    if( err ){
      msg.reply("An error occured while getting the weather - please try again later!");
      msg.twimod.L.warn("Error while getting weather for " + zip);
      msg.twimod.L.warn(err);
    }
    else{
      var toReply = "It's currently " + weather.currently.summary + " (" + Math.floor(weather.currently.temperature) + " F/" + m.toCelsius(Math.floor(weather.currently.temperature)) + " C) in " + city.city + ".\n" + weather.hourly.summary;
      if( weather.alerts && weather.alerts.length > 0 ){
        weather.alerts.forEach(function(v){
          var issued = m.dateFormat(new Date(v.time*1000));
          var expires= m.dateFormat(new Date(v.expires*1000));
          toReply+="\n\n" + v.title + ", issued at " + issued + " and expiring at " + expires + ": \n" + v.description.toString().slice(0, 600) + "...\nMore info: " + v.uri;
        });
      }
      else {
        toReply+=" No alerts issued right now.";
      }
      toReply+="\n\nWeather provided by http://forecast.io/"
      msg.reply(toReply);
    }
  });
}

var init = function(t){

  if( ! fs.existsSync("./plugincfg/weather.json") ){
    t.L.warn("[weather] Please configure weather in ./plugincfg/weather.json, using the weather.json.example file in the plugin folder as a template. weather will not function until this has been done.");
    return;
  }

  var cfg = JSON.parse(fs.readFileSync("./plugincfg/weather.json"));

  forecast = new fcas({
    service: 'forecast.io',
    key: cfg.forecast_key,
    units: 'farenheit',
    cache: true,
    ttl: { minutes: cfg.cache_time }
  });

  getDate=t.L.getDate;
  t.eventHandler.registerCommand("weather", function(msg){

    if( msg.args.length < 1 ){
      msg.reply("Usage: weather <USzipcode>");
      return;
    }

    if( ! msg.args[0].match(new RegExp(/^\d{5}(?:[-\s]\d{4})?$/)) ){ // http://stackoverflow.com/a/2577239 <3
      msg.reply("Please use only United States ZIP codes with this command (e.g. 90210).");
      return;
    }
    m.getForecast(msg.args[0], msg);
  });
}

module.exports = init;

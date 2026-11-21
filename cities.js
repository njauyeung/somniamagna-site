/* Shared by the site and the admin page: city name -> [lon, lat]. Add a city here to make it available everywhere. */
(function () {
  'use strict';
  var CITIES = {
  'toronto': [-79.38, 43.65], 'montreal': [-73.57, 45.5], 'ottawa': [-75.7, 45.42], 'vancouver': [-123.12, 49.28], 'calgary': [-114.07, 51.05],
  'edmonton': [-113.49, 53.55], 'winnipeg': [-97.14, 49.9], 'halifax': [-63.57, 44.65], 'quebec city': [-71.21, 46.81], 'new york': [-74.0, 40.71],
  'boston': [-71.06, 42.36], 'chicago': [-87.63, 41.88], 'los angeles': [-118.24, 34.05], 'san francisco': [-122.42, 37.77], 'seattle': [-122.33, 47.61],
  'miami': [-80.19, 25.76], 'austin': [-97.74, 30.27], 'washington': [-77.04, 38.91], 'london': [-0.13, 51.51], 'paris': [2.35, 48.86],
  'berlin': [13.4, 52.52], 'amsterdam': [4.9, 52.37], 'lisbon': [-9.14, 38.72], 'madrid': [-3.7, 40.42], 'barcelona': [2.17, 41.39],
  'rome': [12.5, 41.9], 'dublin': [-6.26, 53.35], 'zurich': [8.54, 47.38], 'stockholm': [18.07, 59.33], 'dubai': [55.27, 25.2],
  'singapore': [103.82, 1.35], 'hong kong': [114.17, 22.32], 'tokyo': [139.69, 35.68], 'seoul': [126.98, 37.57], 'shanghai': [121.47, 31.23],
  'beijing': [116.41, 39.9], 'sydney': [151.21, -33.87], 'melbourne': [144.96, -37.81], 'mumbai': [72.88, 19.08], 'mexico city': [-99.13, 19.43],
  'sao paulo': [-46.63, -23.55], 'buenos aires': [-58.38, -34.6], 'lagos': [3.38, 6.52], 'cape town': [18.42, -33.92], 'cairo': [31.24, 30.04],
  'istanbul': [28.98, 41.01], 'tel aviv': [34.78, 32.09]
};
  function key(place) { return String(place || '').split(',')[0].trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  window.SM_CITIES = CITIES;
  window.smCity = function (place) { return CITIES[key(place)] || null; };
  window.smCityNames = function () { return Object.keys(CITIES).map(function (k) { return k.replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }); };
})();

/*!
 * CanJS - 2.1.0-pre
 * http://canjs.us/
 * Copyright (c) 2014 Bitovi
 * Fri, 11 Apr 2014 19:07:11 GMT
 * Licensed MIT
 * Includes: CanJS default build
 * Download from: http://canjs.us/
 */
define(["can/util/library", "can/map/attributes", "can/util/string/classize"], function (can) {
	var classize = can.classize,
		proto = can.Map.prototype,
		old = proto.__set;
	proto.__set = function (prop, value, current, success, error) {
		//!steal-remove-start
		var asyncTimer;
		//!steal-remove-end
		
		// check if there's a setter
		var cap = classize(prop),
			setName = 'set' + cap,
			errorCallback = function (errors) {
				//!steal-remove-start
				clearTimeout(asyncTimer);
				//!steal-remove-end
				
				var stub = error && error.call(self, errors);
				// if 'validations' is on the page it will trigger
				// the error itself and we dont want to trigger
				// the event twice. :)
				if (stub !== false) {
					can.trigger(self, 'error', [
						prop,
						errors
					], true);
				}
				return false;
			}, self = this;
			
		
			
		// if we have a setter
		if (this[setName] ) {
			// call the setter, if returned value is undefined,
			// this means the setter is async so we
			// do not call update property and return right away
			can.batch.start();
			
			value = this[setName](value, function (value) {
				old.call(self, prop, value, current, success, errorCallback);
				//!steal-remove-start
				clearTimeout(asyncTimer);
				//!steal-remove-end
			}, errorCallback);
			
			
			if(value === undefined) {
				//!steal-remove-start
				asyncTimer = setTimeout(function(){
					can.dev.warn('can/map/setter.js: Setter ' + setName+' did not return a value or call the setter callback.');
				},can.dev.warnTimeout);
				//!steal-remove-end
				can.batch.stop();
				return;
			} else {
				old.call(self, prop, value, current, success, errorCallback);
				can.batch.stop();
				return this;
			}
			
		} else {
			old.call(self, prop, value, current, success, errorCallback);
		}
		
		return this;
	};
	return can.Map;
});
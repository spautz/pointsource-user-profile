/**
 * Normally I'd never put all of this into one file -- I vastly prefer AMD -- but since this
 * is such a small demo, it'd be massively overkill to create multiple components.
 */

;(function($, can, undefined) {
    // toggles whether or not we actually fetch data from the backend
    var useFixture = true;

    /**
     * @return $.Deferred
     */
    function fetchUserProfileData() {
        var promise;

        // Normally we'd probably define a UserModel for loading and storing the data we fetch
        // from the API, such that we'd do something like
        //      UserModel.findOne('2c97f1e0-988e-4d2f-8011-ab2c33f73f03');
        // And then we'd set up fixtures via that model.
        //
        // However, this is a tiny demo app and we don't need full REST support, so let's just
        // do a single, manual ajax request and just pretend it came from a model.
        if (useFixture) {
            promise = new $.Deferred();
            promise.resolve({
                "person": {
                    "gender": "male",
                    "name": {
                        "last-name": "Zimmerman",
                        "first": "Henry"
                    },
                    "address": {
                        "house-number": "2628",
                        "street-name": "Anderson Drive",
                        "apt-#": null,
                        "st": "North Carolina",
                        "city": "Raleigh",
                        "zip": "27608"
                    }
                }
            });
        } else {
            promise = $.ajax({
                url: '/api/v1/2c97f1e0-988e-4d2f-8011-ab2c33f73f03',
                dataType: 'json'
            });
        }
        return promise;
    };


    //////////////////////////////////////////////////////////////////////////////////////////////

    // On dom ready, we fetch data and then render it via the <user-profile> component.
    $(function() {
        // We single-source the selector, not the jquery collection. This way, if the page changes
        // somehow while we're fetching data, we don't have a jquery collection with detached
        // dom elements in it -- and we'll get either an empty set or the proper elements once
        // we do instantiate it.
        var targetSelector = '#user-profile';

        fetchUserProfileData().done(
            function(rawData) {

                console.log('rawData = ', rawData)
                // Package the raw data into an observable (since we don't have a model)
                // and hand it to a view.
                // Technically we don't really need an observable here, since the data doesn't
                // change, but it doesn't hurt to demo that we can do live binding.
                var userProfile = new can.Map(rawData);

                $(targetSelector).html(
                    can.view('./js/user-profile.mustache', userProfile)
                );
            }
        ).fail(
            function() {
                console.error('Failed to load data: ', arguments, this);
                $(targetSelector).html('A fatal error occurred');
            }
        );

    });

}(jQuery, can));

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

        // Normally we'd probably define a real model class for loading and storing the data
        // from the API, such that we'd do something like
        //      UserModel.findOne('2c97f1e0-988e-4d2f-8011-ab2c33f73f03');
        // And then we'd set up fixtures via that model.
        //
        // However, this is a tiny demo app and we don't need full REST support, so let's just
        // do a single, manual ajax request and just pretend it came from a model.

        if (useFixture) {
            // Note that can.fixture can do this much more nicely. I'm only creating my own
            // promise/deferred here for demonstration purposes.
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

    /**
     * This is a completely fake model: It's just a standard observable with two utterly
     * trivial helpers. A real model would extend can.Model.
     */
    var UserModel = can.Map.extend({
    }, {
        isFemale: function() {
            return this.attr('person.gender') === 'female';
        },
        isMale: function() {
            return this.attr('person.gender') === 'male';
        }
    });

    //////////////////////////////////////////////////////////////////////////////////////////////

    // On dom ready, we fetch data and then render it via the user-profile.mustache template.
    $(function() {
        fetchUserProfileData().done(
            function(rawData) {
                console.log('Loaded user data: ', rawData);
                // Package the raw data into an observable (UserModel) and hand it to a view.
                // Technically we don't really need an observable here, since the data doesn't
                // change, but it doesn't hurt to demo that we can do live binding.
                var userProfile = new UserModel(rawData);

                // Normally we'd probably make a <user-profile> Component (like a web component)
                // but in this case we only need a template -- no behavior -- so I'm taking
                // the easy way out and
                $('#demo-app').html(
                    can.view('./js/user-profile.mustache', userProfile)
                );
            }
        ).fail(
            function() {
                console.error('Failed to load data: ', arguments, this);
                // Normally it would be dumb to repeat '#demo-app' in two places: if we were
                // using a Component then we'd have it handle the error case, and probably
                // the "Loading..." state as well. Then we'd only have/need one .html() call.
                $('#demo-app').html('A fatal error occurred');
            }
        );

    });

}(jQuery, can));

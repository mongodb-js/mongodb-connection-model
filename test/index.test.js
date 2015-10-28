var assert = require('assert');
var Connection = require('../');
var loadOptions = require('../connect').loadOptions;
var parse = require('mongodb-url');
var driverParse = require('mongodb/lib/url_parser');
var fixture = require('mongodb-connection-fixture');
var format = require('util').format;

function isNotValidAndHasMessage(model, msg) {
  assert.equal(model.isValid(), false,
    'It should not be valid, but isValid() did not return false');

  var err = model.validationError;
  assert(err instanceof TypeError);
  assert(new RegExp(msg).test(err.message),
    format('Unexpected error message!  Expected to match `%s` but got `%s`.',
      msg, err.message));
}

/**
 * Test that the connection URL and options are createdb
 * properly for all of the different authentication features
 * that a user may need.
 */
describe('mongodb-connection-model', function() {
  describe('ssl', function() {
    describe('load', function() {
      it('should load all of the files from the filesystem', function(done) {
        var c = new Connection({
          ssl: 'ALL',
          ssl_ca: [fixture.ssl.ca],
          ssl_certificate: fixture.ssl.server,
          ssl_private_key: fixture.ssl.server
        });

        loadOptions(c, function(err, driverOptions) {
          if (err) {
            return done(err);
          }
          var opts = driverOptions.server;
          assert.equal(opts.sslValidate, true);
          assert(Array.isArray(opts.sslCA));
          assert(Buffer.isBuffer(opts.sslCA[0]));
          assert.equal(opts.sslPass, undefined);
          assert(Buffer.isBuffer(opts.sslCert));
          assert(Buffer.isBuffer(opts.sslKey));
          done();
        });
      });
    });
    describe('When ssl is NONE', function() {
      it('should produce the correct driver URL');
      it('should produce the correct driver options');
    });

    describe('When ssl is UNVALIDATED', function() {
      it('should produce the correct driver URL');
      it('should produce the correct driver options');
    });

    describe('When ssl is SERVER', function() {
      it('should produce the correct driver URL');
      it('should produce the correct driver options');
    });

    describe('When ssl is ALL', function() {
      it('should produce the correct driver URL');
      it('should produce the correct driver options');
    });
  });

  describe('When authentication is NONE', function() {
    it('should return the correct URL for the driver', function() {
      var c = new Connection();
      assert.equal(c.driver_url,
        'mongodb://localhost:27017/?slaveOk=true');

      assert.doesNotThrow(function() {
        parse(c.driver_url);
      });

      assert.doesNotThrow(function() {
        driverParse(c.driver_url);
      });
    });
  });

  describe('When authentication is MONGODB', function() {
    it('should not allow specifying kerberos_service_name', function() {
      isNotValidAndHasMessage(new Connection({
        authentication: 'MONGODB',
        kerberos_service_name: 'mongodb'
      }), 'kerberos_service_name field does not apply');
    });

    describe('driver_url', function() {
      it('should include the username and password', function() {
        var c = new Connection({
          mongodb_username: 'arlo',
          mongodb_password: 'woof',
          authentication: 'MONGODB'
        });
        assert.equal(c.driver_url,
          'mongodb://arlo:woof@localhost:27017/?slaveOk=true&authSource=admin');
        assert.doesNotThrow(function() {
          parse(c.driver_url);
        });

        assert.doesNotThrow(function() {
          driverParse(c.driver_url);
        });
      });

      it('should urlencode fields', function() {
        var c = new Connection({
          mongodb_username: '@rlo',
          mongodb_password: 'w@of',
          mongodb_database_name: '@dmin',
          authentication: 'MONGODB'
        });
        assert.equal(c.driver_url,
          'mongodb://%40rlo:w%40of@localhost:27017/?slaveOk=true&authSource=%40dmin');

        assert.doesNotThrow(function() {
          parse(c.driver_url);
        });

        assert.doesNotThrow(function() {
          driverParse(c.driver_url);
        });
      });
    });
  });
  describe('authentication', function() {
    describe('When authentication is LDAP', function() {
      it('should set authentication to LDAP');
      it('should require ldap_username');
      it('should require ldap_password');

      describe('driver_url', function() {
        it('should include authMechanism=PLAIN', function() {
          var c = new Connection({
            authentication: 'LDAP',
            ldap_username: 'arlo',
            ldap_password: 'w@of'
          });
          assert.equal(c.driver_auth_mechanism, 'PLAIN');

          assert.equal(c.driver_url,
            'mongodb://arlo:w%40of@localhost:27017/?slaveOk=true&authMechanism=PLAIN');

          assert.doesNotThrow(function() {
            parse(c.driver_url);
          });

          assert.doesNotThrow(function() {
            driverParse(c.driver_url);
          });
        });
      });
    });

    describe('When authentication is X509', function() {
      it('should set authentication to X509');
      it('should require x509_username');
      describe('driver_url', function() {
        it('should include authMechanism=X509', function() {
          var c = new Connection({
            authentication: 'X509',
            x509_username: 'CN=client,OU=arlo,O=MongoDB,L=Philadelphia,'
              + 'ST=Pennsylvania,C=US'
          });
          assert.equal(c.driver_auth_mechanism, 'MONGODB-X509');
          assert.equal(c.driver_url,
            'mongodb://CN%253Dclient%252COU%253Darlo%252CO%253DMongoDB%252CL%253DPhiladelphia'
            + '%252CST%253DPennsylvania%252CC%253DUS@localhost:27017/'
            + '?slaveOk=true&authMechanism=MONGODB-X509');
          assert.doesNotThrow(function() {
            parse(c.driver_url);
          });

          assert.doesNotThrow(function() {
            driverParse(c.driver_url);
          });
        });
      });
    });

    describe('When authentication is KERBEROS', function() {
      it('should require a principal', function() {
        isNotValidAndHasMessage(new Connection({
          authentication: 'KERBEROS'
        }), 'kerberos_principal field is required');
      });

      it('should *only* require a principal', function() {
        var c = new Connection({
          authentication: 'KERBEROS',
          kerberos_principal: 'lucas@kerb.mongodb.parts'
        });
        assert.equal(c.isValid(), true);

        assert.equal(c.driver_url,
          'mongodb://lucas%2540kerb.mongodb.parts:@localhost:27017/'
          + 'kerberos?slaveOk=true&gssapiServiceName=mongodb&authMechanism=GSSAPI');

        assert.doesNotThrow(function() {
          parse(c.driver_url);
        });

        assert.doesNotThrow(function() {
          driverParse(c.driver_url);
        });
      });

      it('should return the correct URL for the driver', function() {
        var c = new Connection({
          kerberos_principal: 'arlo/dog@krb5.mongodb.parts',
          kerberos_password: 'w@@f',
          kerberos_service_name: 'mongodb',
          authentication: 'KERBEROS'
        });
        assert.equal(c.driver_url,
          'mongodb://arlo%252Fdog%2540krb5.mongodb.parts:w%40%40f@localhost:27017/'
          + 'kerberos?slaveOk=true&gssapiServiceName=mongodb&authMechanism=GSSAPI');

        assert.doesNotThrow(function() {
          parse(c.driver_url);
        });

        assert.doesNotThrow(function() {
          driverParse(c.driver_url);
        });
      });
    });
  });

  describe('from', function() {
    it('should urldecode mongodb_username');
    it('should urldecode ldap_username');
    it('should urldecode x509_username');
    it('should urldecode kerberos_principal');
  });
});

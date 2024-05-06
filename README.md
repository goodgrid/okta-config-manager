# Okta Config Manager

The Okta Config Manager is a tool to turn Okta configuration into managable objects stored in a no-sql database. Once in the database, the objects can be pushed to other Okta instances. The goal of this is to be able to distribute configuration sets to the various Okta instances in a DTAP lifecycle.

## Configuration

Before using this tool, it needs to be set up. The configuration is contained in config.js which refers to secrets in secrets.js. These two are split to be able to  manage config.js in version management and leave secrets.js out of version management.

```
const config = {
    debug: false,
    apiRequestDelay: [Number of miliseconds to pause between API calls to Okta],
    db: {
        host: "[Mongo server host]",
        username: "[Mongo user account]",
        password: secrets.mongo.password
    },
    instances: {
        acc: {
            baseUrl: "https://[okta host]/api/v1",
            token: secrets.okta.cgToken
        },
        tst: {
            baseUrl: "https://[okta host]/api/v1",
            token: secrets.okta.dev1Token
        }
    }
}
```

The token properties which need to be included in the secrets.js are API tokens. The API token needs to be bound to a user account with sufficient privileges. So far, use has been tested with the Super Administrator role.

What the tool will do is also dependent on the 'object type definitions' in types.js. In this file, javascript objects are defined for the various Okta objects and how to handle them. Optionally, objects can be skipped for getting and/or setting here. Individual objects can be excluded from processing my adding the 'exluded: true' flag to the objects in the database.


## Required manual tasks before syncing
 
- Emppty network zones are not supported by Okta, while the 'LegacyIPZone' is empty be default. This zone needs to be configured with 0.0.0.0 in the source instance before starting.
- Add user properties in the user schema. The user schema is not synched
- Enable and configure authenticators/factors. These are not synced. 

## Optional manual tasks after syncing

- General configuration settings are not synced automatically
- General security configuration settings are not synced automatically


## Usage

This is a command line tool taking two or three arguments. There is a main argument being either get or set. If the argument is get, then one additional argument is required, being the instance name stemming from the configuration file. For example:

    node okta-config-manager.js get prd

This command will get all Okta configuration and store it in the database.

When pushing configiration to a target, one would do:

    node okta-config-manager.js set prd acc

This command would get the most recent set of configuration (based on the session property in the database) from source 'prd' and push it to target 'acc'.

## Known issues

- While replacing values it can happen that the wrong object is returned if the database contains a large history of the target instance. This is a TODO in the helperReplaceGroupId function.
- Replacing properties of another type than array is not implemented yet. There are currently replacd by the value 'test' 
- Built-in groups are attempted to be updated. This results in an error while processing continue. Errors while updating groups "Everyone" and "System administrators" can be ignored.
- Group rules based on the 'isMemberOfAnyGroup' method fails, becasue the reference to the groupId in the expression is not replaced. These rules are best to be rewritten to refer to a group based on its name, instead of pointing to the group in the UI
- Group rules are created inactive and are currently not activated by the sync. They need to be activated by hand, while keeping in mind that some rules are inactive on the source instance as well.


## Product Backlog

The following features are not implemented yet

- Implementation of log leveling
- Support for user schema
- Enabling group rules based on state at source instance
- Support for currently missing object type:
  - Identity providers
  - Apps
  - Brands
- Support for other Okta config, such as
   - General instance settings
   - General security settings
 - Change the use of Okta API tokens to oAuth integrations
 - Improve error handling
   - Gracfully handle or retry in case of connection resets with a resource
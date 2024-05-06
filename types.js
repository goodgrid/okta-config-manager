
const objectTypes = [ 
    /*
        TODO: Find a way to prepare the user schema. Currenty the http method for both updates and creations
        are put, so this object is not compatible with the implementation.
    { 
        name: "userSchema",
        parents: [],
        extract: true,
        upsert: true,
        exclude: [],
        replaceProps: [],
        deletableProps: [],
        endpoint: "meta/schemas/user/default",
        queryString: ``,
        comparisonProp: "name",
    },
    */
    { 
        name: "oktaGroup",
        parents: [],
        extract: true,
        upsert: true,
        exclude: ["Everyone", "Okta Administrators"],
        replaceProps: [],
        deletableProps: [],
        endpoint: "groups",
        queryString: `filter=type eq "OKTA_GROUP" or type eq "BUILT_IN"`,
        comparisonProp: "profile.name",
    },
    {
        name: "zone",
        parents: [],
        extract: true,
        upsert: true,
        exclude: [],
        replaceProps: [
        ],
        deletableProps: [],
        endpoint: "zones",
        queryString: ``,
        comparisonProp: "name",
    },
    {
        name: "groupRule",
        parents: [],
        extract: true,
        upsert: true,
        exclude: [],
        deletableProps: [],
        endpoint: "groups/rules",
        queryString: ``,
        comparisonProp: "name",
        exclude: [],
        deletableProps: [
            "conditions.people.users.exclude",
        ],
        replaceProps: [
            {
                function: "arrayIdSwitch",
                path: "actions.assignUserToGroups.groupIds",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            },
            {
                function: "arrayIdSwitch",
                path: "conditions.people.groups.exclude",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            },            
            {
                function: "groupExpressionChange",
                path: "conditions.expression.value",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            }
            
            
        ],
        /*
            TODO: Implement this if we want for example group rules to enable
            group rules after having created them.
        */
        postCreateActions: [ 

            {
                method: "POST",
                endpoint: "groups/rules/{id}/lifecycle/activate",
                body: {}
            }
        ]
    },
    {
        name: "globalSignOnPolicy",
        parents: [],
        extract: true,
        upsert: true,
        endpoint: "policies",
        queryString: "type=OKTA_SIGN_ON", 
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],
        replaceProps: [
            {
                function: "arrayIdSwitch",
                path: "conditions.people.groups.include",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            }
        ]
    },
    {
        //    This object is only present in Okta Identity Engine. Disable it for use with 
        //    Okta Classic instances.
        name: "accessPolicy", 
        parents: [],
        extract: false,
        upsert: false,
        endpoint: "policies",
        queryString: "type=ACCESS_POLICY",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],
        replaceProps: [
            {
                function: "arrayIdSwitch",
                path: "conditions.people.groups.include",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            }
        ]
    },
    {    
        name: "passwordPolicy",
        parents: [],
        extract: true,
        upsert: true,
        endpoint: "policies",
        queryString: "type=PASSWORD",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],
        replaceProps: [
            {
                function: "arrayIdSwitch",
                path: "conditions.people.groups.include",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            }
        ]
    },
    {
        name: "enrollmentPolicy",
        parents: [],
        extract: true,
        upsert: true,
        endpoint: "policies",
        queryString: "type=MFA_ENROLL",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],
        replaceProps: [
            {
                function: "arrayIdSwitch",
                path: "conditions.people.groups.include",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            }
        ]
    },
    {
        name: "policyRule",
        parents: ["passwordPolicy", "globalSignOnPolicy", "accessPolicy", "enrollmentPolicy"],
        extract: true,
        upsert: true,
        endpoint: "policies/{id}/rules",
        queryString: "",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [
            "conditions.app"
        ],
        replaceProps: [
            {
                function: "arrayIdSwitch",
                path: "conditions.network.include",
                object: "zone",
                comparisonProp: "name"
            },
            {
                function: "arrayIdSwitch",
                path: "conditions.network.exclude",
                object: "zone",
                comparisonProp: "name"
            }
        ]
    },
    
]

export default objectTypes
# jira-inator

Creates jira stories and epics using Jira REST API.

## Installation

`git clone https://github.com/nmusaelian-rally/jira-inator.git && cd jira-inator && npm i`

Jira credentials are read from `.env` file in the root directory. Create `.env` file, e.g.
```
USERNAME="test"
PASSWORD="Password"
```

Use `domain`, `port`, `projectKey` specific to your Jira instance in `config.js` 
```
const config = {
    domain: 'https://jira-name.testn.f4tech.com',
    //port: '8080',
    projectKey: 'FOO', 
    apiPath: 'rest/api/2/issue',
    agilePath: 'rest/agile/1.0/epic',
    supportedTypes: 'Epic,Story'
  };
  
  module.exports = config;
  ```

## Usage

```
% node app.js --help
app.js [command]

Commands:
  app.js create  create stories
  app.js delete  delete issues

% node app.js create --help
app.js create

create stories

Positionals:
  count  how many stories to create                                [default: 10]
  epic   create epic, link to stories

% node app.js delete --help
app.js delete

delete issues

Positionals:
  start  start index, e.g. 1 if start with FOO-1
  end    end index, e.g. 100 if end with F00-100

```
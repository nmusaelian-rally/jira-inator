# jira-inator

Creates jira stories and epics using Jira REST API.

## Installation

`git clone https://github.com/nmusaelian-rally/jira-inator.git && cd jira-inator && npm i`

Jira credentials are read from `.env` file in the root directory. Create `.env` file, e.g.
```
USERNAME="test"
PASSWORD="Password"
```

## Usage

Use `jiraUrl` and `projectKey` specific to your Jira instance, e.g.
```node app.js create --jiraUrl='https://jira-name.testn.f4tech.com' --projectKey='SP' --count=5 --epic```
```node app.js delete --jiraUrl='https://jira-nik4.testn.f4tech.com' --projectKey='SP' --start=22 --end=39```


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
  jiraUrl     Jira url
  projectKey  Jira project key
  count       how many stories to create                           [default: 10]
  epic        create epic, link to stories

% node app.js delete --help
app.js delete

delete issues

Positionals:
  jiraUrl     Jira url
  projectKey  Jira project key
  start       start index, e.g. 1 if start with FOO-1
  end         end index, e.g. 100 if end with F00-100

```
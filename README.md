# jira-inator

Bulk creates jira stories and epics using Jira REST API.
Update functionality is designed to make changes in quick succession in attempt to generate concurrency conflict on the Rally side when `jira-inator` is used to populate Jira project mapped to a Rally workspace via LAC adapter.

## Installation

`git clone https://github.com/nmusaelian-rally/jira-inator.git && cd jira-inator && npm i`

Jira credentials are read from `.env` file in the root directory. Create `.env` file, e.g.
```
USERNAME="test"
PASSWORD="Password"
```

## Usage

Use `jiraUrl` and `projectKey` specific to your Jira instance, e.g.
```
node app.js create --jiraUrl='https://jira-name.testn.f4tech.com' --projectKey='SP' --count=5 --epic
node app.js delete --jiraUrl='https://jira-name.testn.f4tech.com' --projectKey='SP' --start=22 --end=39
node app.js update --jiraUrl='https://jira-name.testn.f4tech.com' --projectKey='SP' --summary='abc'  --board=35  --interval=2000 --sprint=38 --loop=1
```
```
% node app.js --help
app.js [command]

Commands:
  app.js create  create stories
  app.js delete  delete issues
  app.js update  create and update issue

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

% node app.js update --help

create and update issue

Positionals:
  jiraUrl     Jira url
  projectKey  Jira project key
  summary     issue summary, e.g. BadBug
  board       board id, see status bar when hover over Configure menu in boards
  sprint      sprint id, e.g. 42, if null, new sprint will be created     [default: null]
  loop        how many times to rename, add and remove issue from sprint  [default: 0]
  interval    interval in ms between update requests                      [default: 10000]

```
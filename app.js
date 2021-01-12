const fetch = require('node-fetch');
const URL   = require('url');

require('dotenv').config()
const { USERNAME, PASSWORD } = process.env
const apiPath = 'rest/api/2/issue';
const agilePath = 'rest/agile/1.0/epic';
const sprintPath = 'rest/agile/1.0/sprint';
const backlogPath = 'rest/agile/1.0/backlog'


let jiraURLs = {};
const endpoint = 'createmeta'

var headers = {
    "Content-Type":"application/json",
    'Authorization': 'Basic ' + Buffer.from(USERNAME + ":" + PASSWORD).toString('base64')
}

let cachedIssueInfo = {}
const newIssues = [];
const updatedIssues = [];
let currentSprintId = null;

const jiraUrlMaker = (jiraUrl, projectKey) => {
    return  {
        baseUrl: `${jiraUrl}/${apiPath}`,
        epicLinkBaseUrl : `${jiraUrl}/${agilePath}`,
        sprintBaseUrl : `${jiraUrl}/${sprintPath}`,
        backlogBaseUrl : `${jiraUrl}/${backlogPath}`,
        projectKey: projectKey
    }
}

const queryURL = (issueType) => {
    //example: http://34.105.88.232:8080/rest/api/2/issue/createmeta?projectKey=FAN&issuetypeNames=Epic&expand=projects.issuetypes.fields
    let params = {projectKey: jiraURLs.projectKey, issuetypeNames: issueType, expand: 'projects.issuetypes.fields'}
    let url  = `${jiraURLs.baseUrl}/${endpoint}${URL.format({ query: params })}` 
    return url
}

const saveIssueInfo = async (issueType) => {
    let url = queryURL(issueType)
    if (!cachedIssueInfo.hasOwnProperty(issueType)){
        //console.log('fetching from server')
        let response = await fetch(url, {headers: headers})
        let data = await response.json()
        cachedIssueInfo[issueType] = data["projects"][0]["issuetypes"][0]
    }else{
        //console.log('fetching from cache')
    }
    return cachedIssueInfo[issueType]
}

const requestBody = async (issueType) => {
    let body = {} 
    await saveIssueInfo(issueType)
    let timestamp = Date.now()
    if (issueType == 'Story'){
    //if (issueType == 'Bug'){
        body = {"fields":{"project":{"key": jiraURLs.projectKey}, 
        "summary": `1st batch Story ${timestamp}`,
        "description": "Creating a Story via REST",
        "issuetype": {"name": "Story"}}}
    } else if(issueType == 'Epic'){
        //identify customfield_xxx object with key "name" which is set to "Epic Name" to use it in the payload
        let fields = cachedIssueInfo[issueType]['fields']
        let keys = Object.keys(fields);
        let cfKeys = keys.filter(key => key.toLowerCase().includes("customfield_"));
        for (let val of cfKeys){
            if (fields[val]["name"] == 'Epic Name'){
                body = {"fields":{"project":{"key": jiraURLs.projectKey}, 
                         [val]: `1st batch Epic ${timestamp}`,
                         "summary": `1st batch Epic ${timestamp}`,
                         "description": "Creating an Epic via REST",
                         "issuetype": {"name": "Epic"}}}
            }
         }
    }
    return body
}

const createIssue = async (body = {}) => {
    try{
        const response = await fetch(jiraURLs.baseUrl, {
            method: 'POST', 
            mode: 'cors', 
            cache: 'no-cache', 
            credentials: 'same-origin', 
            headers: headers,
            body: JSON.stringify(body) 
          });
        return response.json(); 
    }catch(err){
      console.log(err)
    }
  }

  const deleteIssue = async (index) => {
    try{
        let deleteUrl = `${jiraURLs.baseUrl}/${jiraURLs.projectKey}-${index}`;
        const response = await fetch(deleteUrl, {
          method: 'DELETE', 
          mode: 'cors', 
          cache: 'no-cache', 
          credentials: 'same-origin', 
          headers: headers
        });
        return response.text; 
    } catch(err){
        console.log(err);
    }
  }

  const updateIssue = async (newSummary, issueKey) => {
    console.log(`updating issue ${issueKey}`)
    try{
        updatedIssues.push(issueKey);
        let updateUrl = `${jiraURLs.baseUrl}/${issueKey}`;
        let data = {"fields": {"summary": newSummary}};
        const response = await fetch(updateUrl, {
            method: 'PUT', 
            mode: 'cors', 
            cache: 'no-cache', 
            credentials: 'same-origin', 
            headers: headers,
            body: JSON.stringify(data)
          });
        return response.text();  
    } catch(err){
        console.log(err);
    }
  }

  const createSprint = async (body) => {
      console.log('creating a sprint')
      try{
        const response = await fetch(jiraURLs.sprintBaseUrl, {
            method: 'POST', 
            mode: 'cors', 
            cache: 'no-cache', 
            credentials: 'same-origin', 
            headers: headers,
            body: JSON.stringify(body) 
          });
        return response.json(); 
      } catch(err){
          console.log(err)
      }
  }

  const linkStoriesToEpic = async (epicKey, storyKeys) => {
      // example: 
      //url: http://34.105.88.232:8080/rest/agile/1.0/epic/FOO-1049/issue
      //payload: { "issues": ["FOO-1003"]}
      try{
          let url = `${jiraURLs.epicLinkBaseUrl}/${epicKey}/issue`
          let data = {"issues": storyKeys}
          const response = await fetch(url, {
            method: 'POST', 
            mode: 'cors', 
            cache: 'no-cache', 
            credentials: 'same-origin', 
            headers: headers,
            body: JSON.stringify(data)
          });
        return response.text(); 
      }catch(err) {
        console.log(err)
      }
  }

  const bulkCreateIssues = async (count, linkToEpic=false) => {  
    console.log(`Creating ${count} stories...`)  
    try{
        for(let i = 0; i < count; i++){
            if(i % 10 == 0){
                console.log('.')
            }
            await new Promise(async next => {
                await requestBody('Story').then(createIssue).then(res => newIssues.push(res['key'])); 
                //await requestBody('Bug').then(createIssue).then(res => newIssues.push(res['key'])); 
                next()
            })
        }
        if (linkToEpic){
            console.log(`Creating an epic, linking ${count} stories to it...`)
            let epicKey = await requestBody('Epic').then(createIssue).then(res => res['key']);
            await linkStoriesToEpic(epicKey, newIssues)
        }
    }catch (error) {
        console.log(error)
    }
}

const bulkDeleteIssues = async (start, end) => {
    console.log(`Deleting stories starting at index ${start}, ending at ${end}...`);
    try{
        for(let i = start; i <= end; i++){
            await deleteIssue(i)
        }
    }catch(error){
        console.log(error)
    }
}

const addIssuesToSprint = async (sprintId, storyKeys) => {
    try{
        console.log(`adding issues to sprint ${storyKeys}`)
        let url = `${jiraURLs.sprintBaseUrl}/${sprintId}/issue`;
        let data = {"issues": storyKeys};
        currentSprintId = sprintId;
          const response = await fetch(url, {
            method: 'POST', 
            mode: 'cors', 
            cache: 'no-cache', 
            credentials: 'same-origin', 
            headers: headers,
            body: JSON.stringify(data)
          });
        return response.text(); 
    }catch(err){
        console.log(err)
    }
}

const moveIssuesToBacklog = async (storyKeys) => {
    try{
        console.log(`moving issues to backlog ${storyKeys}`)
        let url = `${jiraURLs.backlogBaseUrl}/issue`;
        console.log(url) ///rest/agile/1.0/backlog/issue
        let data = {"issues": storyKeys}
          const response = await fetch(url, {
            method: 'POST', 
            mode: 'cors', 
            cache: 'no-cache', 
            credentials: 'same-origin', 
            headers: headers,
            body: JSON.stringify(data)
          });
        return response.text(); 
    }catch(err){
        console.log(err)
    }
}

const createAndUpdateIssue = async (summary, sprint, boardId, loopCount) => {
    await requestBody('Story').then(createIssue).then(res => updateIssue(summary, res['key']));
    let body = {"name": sprint, "originBoardId": boardId}
    await createSprint(body).then(res => addIssuesToSprint(res['id'], updatedIssues))
    await moveIssuesToBacklog(updatedIssues);
    for(let i = 0; i < loopCount; i++){
      await updateIssue(summary.split("").reverse().join(""), updatedIssues[0]);
      await addIssuesToSprint(currentSprintId, updatedIssues);
      await moveIssuesToBacklog(updatedIssues);
    }
}

const argv = require('yargs')
    .command('create', 'create stories', (yargs) => {
        yargs
           .positional('jiraUrl', { describe: "Jira url"})
           .positional('projectKey', {describe: 'Jira project key'})
           .positional('count', {
               describe: 'how many stories to create',
               default: 10
           }).positional('epic', {
               describe: 'create epic, link to stories'
           })
    }, (argv) => {
        jiraURLs = jiraUrlMaker(argv.jiraUrl, argv.projectKey)
        bulkCreateIssues(argv.count, argv.epic)
    }).command('delete', 'delete issues', (yargs) => {
        yargs 
           .positional('jiraUrl', { describe: 'Jira url'})
           .positional('projectKey', {describe: 'Jira project key'})
           .positional('start', {
               describe: 'start index, e.g. 1 if start with FOO-1'
           }).positional('end', {
               describe: 'end index, e.g. 100 if end with F00-100'
           })
    }, (argv) => {
        jiraURLs = jiraUrlMaker(argv.jiraUrl, argv.projectKey)
        bulkDeleteIssues(argv.start, argv.end)
    }).command('update', 'create and update issue', (yargs) => {
        yargs
        .positional('jiraUrl', { describe: 'Jira url'})
        .positional('projectKey', {describe: 'Jira project key'})
        .positional('summary', {describe: 'issue summary, e.g. BadBug'})
        .positional('sprint', {describe: 'sprint name, e.g. Sprint1'})
        .positional('board', {describe: 'board id, see status bar when hover over Configure menu in boards'})
        .positional('loop', {describe: 'how many times to rename, add and remove issue from sprint'})
    }, (argv) => {
        jiraURLs = jiraUrlMaker(argv.jiraUrl, argv.projectKey)
        createAndUpdateIssue(argv.summary, argv.sprint, argv.board, argv.loop)
    })
    .argv;


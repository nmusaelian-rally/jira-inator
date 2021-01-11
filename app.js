const fetch = require('node-fetch');
const URL   = require('url');

require('dotenv').config()
const { USERNAME, PASSWORD } = process.env
const apiPath = 'rest/api/2/issue';
const agilePath = 'rest/agile/1.0/epic';

let jiraURLs = {};
const endpoint = 'createmeta'

var headers = {
    "Content-Type":"application/json",
    'Authorization': 'Basic ' + Buffer.from(USERNAME + ":" + PASSWORD).toString('base64')
}

let cachedIssueInfo = {}
const newIssues = []

const jiraUrlMaker = (jiraUrl, projectKey) => {
    return  {
        baseUrl: `${jiraUrl}/${apiPath}`,
        epicLinkBaseUrl : `${jiraUrl}/${agilePath}`,
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
        deleteUrl = `${jiraURLs.baseUrl}/${jiraURLs.projectKey}-${index}`
        const response = await fetch(deleteUrl, {
          method: 'DELETE', 
          mode: 'cors', 
          cache: 'no-cache', 
          credentials: 'same-origin', 
          headers: headers
        });
        return response.text; 
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
           .positional('jiraUrl', { describe: "Jira url"})
           .positional('projectKey', {describe: 'Jira project key'})
           .positional('start', {
               describe: 'start index, e.g. 1 if start with FOO-1'
           }).positional('end', {
               describe: 'end index, e.g. 100 if end with F00-100'
           })
    }, (argv) => {
        jiraURLs = jiraUrlMaker(argv.jiraUrl, argv.projectKey)
        bulkDeleteIssues(argv.start, argv.end)
    }).argv;


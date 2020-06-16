const fetch = require('node-fetch');
const URL   = require('url')
require('dotenv').config()
const config = require('./config');
const { USERNAME, PASSWORD } = process.env

const baseUrl = config['port'] ? `${config['domain']}:${config['port']}/${config['apiPath']}` : `${config['domain']}/${config['apiPath']}`
const endpoint = 'createmeta'
const [epic, story] = config['supportedTypes'].split(',');

var headers = {
    "Content-Type":"application/json",
    'Authorization': 'Basic ' + Buffer.from(USERNAME + ":" + PASSWORD).toString('base64')
}

const queryURL = (issueType) => {
    //example: http://34.105.88.232:8080/rest/api/2/issue/createmeta?projectKey=FAN&issuetypeNames=Epic&expand=projects.issuetypes.fields
    let params = {projectKey: config['projectKey'], issuetypeNames: issueType, expand: 'projects.issuetypes.fields'}
    let url  = `${baseUrl}/${endpoint}${URL.format({ query: params })}` 
    return url
}

const fields = async (issueType) => {
    let url = queryURL(issueType)
    //console.log(url)
    let response = await fetch(url, {headers: headers})
    let data = await response.json()
    return data["projects"][0]["issuetypes"][0]
}

const requestBody = async (issueType, idx) => {
    let body = {} 
    let issueInfo = await fields(issueType)
    //console.log(issueInfo["name"])
    if (issueInfo["name"] == 'Story'){
        body = {"fields":{"project":{"key": "FAN"}, 
        "summary": `Story ${idx} via REST`,
        "description": "Creating a Story via REST",
        "issuetype": {"name": "Story"}}}
    } else if(issueInfo["name"] == 'Epic'){
        let fields = issueInfo["fields"]
        let keys = Object.keys(fields);
        let cfKeys = keys.filter(key => key.toLowerCase().includes("customfield_"));
        for (let val of cfKeys){
            if (fields[val]["name"] == 'Epic Name'){
                body = {"fields":{"project":{"key": "FAN"}, 
                         [val]: `Epic ${idx}`,
                         "summary": `Epic ${idx}`,
                         "description": "Creating an Epic via REST",
                         "issuetype": {"name": "Epic"}}}
            }
         }
    }
    return body
}

const createIssue = async (body = {}) => {
    const response = await fetch(baseUrl, {
      method: 'POST', 
      mode: 'cors', 
      cache: 'no-cache', 
      credentials: 'same-origin', 
      headers: headers,
      body: JSON.stringify(body) 
    });
    return response.json(); 
  }

  const deleteIssues = async (index) => {
    try{
        deleteUrl = `${baseUrl}/${config['projectKey']}-${index}`
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

  for (i = 0; i < 10000; i++) {
    requestBody(epic, i).then(createIssue)
  }

  
//requestBody(story).then(createIssue)





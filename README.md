# interrogate

node.js prompt module for asking the same questions different ways

## overview

This document refers to the [prompt.js](https://github.com/appcelerator/appc-cli/blob/CLI-327/lib/prompt.js) module in appc-cli. It aims to provide an identical API for interactive prompting that works for both CLI input and data delivered via socket.

The module exposes a single function `prompt(questions, opts, callback)`. It's job is to deliver a series of questions to a user, allow the user to answer those questions, do any necessary processing on those answers (validation, filtering, etc...), and then pass those answers back to the program that invoked `prompt()`. The below sections details how this API can be used for both CLI input processing, as well as input delivered via socket communications. 

## CLI prompting

When using `prompt.js` to get input from the CLI, it is simply a thin wrapper over [inquirer.js][]. The API can be used identically to the documentation listed on the inquirer.js site, with a single exception. Instead of the `prompt()` function returning only an `answers` object to its callback, it now returns an `err` object and `answers` object. 

```js
prompt([{ 
  name: 'myField', 
  type: 'input' 
}], function(err, answers) {
  /* check err, do something with answers */
});
``` 

Other than this above change, all other usage for CLI input processing is identical to inquirer.js and there's no sense in repeating it here.

## socket-based prompting

> _As of right now, the only intended use case for this is Appcelerator Studio. The documentation will be updated to support other avenues of usage is necessary._

### client-side

As noted above in the [CLI prompting](#cli-prompting) section, [inquirer.js][] is the foundation for this API. On the client-side, it is invoked and fed data back just like the inquirer.js API. To tell prompt.js to use the socket interface rather than the default CLI interface, you'd do the following:

```js
var questions = [{ name: 'myField', type: 'input' }];
var opts = { 
  socket: true,
  port: 19191 // optional, uses 22212 by default
};
prompt(questions, opts, function(err, answers) {
  /* check err, do something with answers */
});
``` 

As far as how to create a list of questions and process the answers, refer to the [inquirer.js][] documentation.

### server-side

The server side requires a simple TCP server listening on an agreed upon port. As noted above, the default port for prompt.js is `22212`, but is configurable. Here is the flow for how the client-side sends a question to the the server and how the server sends back a response.

1. client connects to server on specified port
2. client sends the server a [JSON question request](#question-request)
3. server parses the JSON question request and renders the question in a suitable format (in the case of Appcelerator Studio, as a user-editable dialog)
4. server receives user input (an answer), `JSON.stringify()`'s the answer, then sends it back to the client
5. client receives server response
    1. if client successfully parses and validates response, skip to step #8
    2. if there is a client-side error, continue to step #6
6. an [error request from client](#error-request-from-client) is sent to the server indicating the error and the question to be asked again
7. repeat from step #3 until client generates no errors
8. client saves the question/answer pair, and either
    1. has no more questions to ask, closes the connection, returns the answer object to the client's callback
    2. has more questions, repeat from step #2


#### question request

Full details of the [inquirer question object](https://github.com/SBoudrias/Inquirer.js/) are in the inquirer.js documentation. This documentation should be used as a DSL for the server-side to render the questions. In the case of Appcelerator Studio, the properties and values in the question object will determine what text boxes, comboboxes, etc... will be used to query the user.

```js
{
  "type": "question",
  "question": { /* inquirer question object */ }
}
```

#### error response from server

> _not implemented, but probably will need to be at some point_

#### error request from client

These error responses from the client back to the server are sent in 2 possible cases:

1. The client cannot parse the answer sent to it by the server (not valid JSON)
2. The answer from the server fails the `validate()` function on the client-side

The `question` object in this case is the original question that generated the error. It should be asked again by the server. 

Full details of the [inquirer question object](https://github.com/SBoudrias/Inquirer.js/) are in the inquirer.js documentation. This documentation should be used as a DSL for the server-side to render the questions. In the case of Appcelerator Studio, the properties and values in the question object will determine what text boxes, comboboxes, etc... will be used to query the user.

```js
{
  "type": "error",
  "message": "this is the error message from the client, can be displayed to user",
  "question": { /* inquirer question object */ }
}
```


[inquirer.js]: https://github.com/SBoudrias/Inquirer.js/
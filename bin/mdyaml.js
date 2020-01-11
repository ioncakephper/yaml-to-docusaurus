const htmlDomParser = require("html-dom-parser");

let html = "<ul><li>Documentation Project Goes Here<ul><li>First topic</li></ul></li></ul>";
let domJson = htmlDomParser(html);

console.log(domJson);
console.log(domJson[0].children[0]);

let content = domJson.element("html").firstChild("ul");

let project = content.firstChild("li").firstChildType("text").data;
let topics = content.firstChild("li").firstChildType("ul");
topics.forEach(topic => {
    
})


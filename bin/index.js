#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const YAML = require("yamljs");
const Handlebars = require("handlebars");
const program = require("commander");


program
    .version("1.0.0")
    .option("-o, --output <path>", "Docusaurus output documents path", "./docs")
    .option("-w, --website <path>", "Docusaurus website folder", "./website")
    ;

var options = {};
var config = {
    "markdownExtension": ".md",
    "templateExtension": ".handlebars",
    "templates": "./templates",
    "extension": ".yaml"
}
program.parse(process.argv);

let fn = (program.args.length > 0) ? program.args[0] : "yaml-to-docusaurus";
loadConfiguration();
fn = setMissingExtension(fn, config.extension);
options = applyDefaultOptions(program.opts());

execute(fn);


function execute(outlineFilename) {

    var doc = YAML.parse(fs.readFileSync(outlineFilename, "utf8"));
    var topics = doc.topics;

    // Generate topic markdown files
    if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output);
    }
    generateDocuments(topics);

    // Generate sidebar.json in ./website folder
    if (!fs.existsSync(options.website)) {
        fs.mkdirSync(options.website)
    }
    generateSidebar(topics);
}

function generateSidebarFolders(topics) {
    let folders = [];
    let folder = {"title": "", "slugs": [], "last": "", "done": false, "folders": []};
    topics.forEach(topic => {
        if (topic.folder) {

            folder.last = folder.slugs.pop();
            if (folder.title.length > 0) {
                folders.push(folder); 
            }        
            let folderTitle = topic.title;
            folder = {"title": folderTitle, "slugs": [], "last": "", "done": false, "folders": []};
        }

        folder.slugs.push(getTopicBasename(topic));
        
        if (topic.topics) {
            topic.topics.forEach(childTopic => {
                folder.slugs.push(getTopicBasename(childTopic));
            });
        }
    })
    if (!folder.done) {
        folder.last = folder.slugs.pop();
        folder.done = true;
        folders.push(folder);
    }

    return folders;
}

function generateSidebar(topics) {

    let data = {};
    data.folders = generateSidebarFolders(topics);
    data.last = data.folders.pop();

    let result = generateFromTemplate("sidebars-template", data);
    let sidebarFilename = [options.website, "sidebars.json"].join("\\");
    fs.writeFileSync(sidebarFilename, result, "utf8");
}

function generateFromTemplate(templateBasename, data) {
    let tfn = setMissingExtension(templateBasename, config.templateExtension);
    tfn = [config.templates, tfn].join("\\");
    let template = Handlebars.compile(fs.readFileSync(tfn, "utf8"));
    return template(data);

}

function generateHeaders(headers, level) {
    let content = "";
    headers.forEach(header => {
        content += generateFromTemplate("header-template", {
            "headmark": "#".repeat(level),
            "title": header.title,
            "brief": header.brief,
            "content": (header.headers) ? generateHeaders(header.headers, level + 1) : ""
        })
    })
    return content;
}

function generateDocuments(topics) {
    topics.forEach(topic => {

        let data = {};
        data.slug = getTopicBasename(topic);
        data.title = topic.title;
        data.brief = topic.brief;

        data.content = (topic.headers) ? generateHeaders(topic.headers, 2) : "";

        let result = generateFromTemplate("topic-template", data);
        writeDocument(topic, result);

        if (topic.topics) {
            generateDocuments(topic.topics);
        }
    })
}

function getTopicBasename(topic) {
    let source = (topic.slug) ? topic.slug : (topic.short) ? topic.short : topic.title;
    return slug(source);
}

function getTopicFilename(topic) {
    let basename = getTopicBasename(topic);
    return setMissingExtension(basename, config.markdownExtension);
}

function slug(source) {
    // TODO: remove heading and trailing special characters
    // TODO: replace sequence of special characters with a single dash
    return source.trim().toLowerCase().replace(/ +/g, "-");
}

function writeDocument(topic, body) {
    let filename = getTopicFilename(topic);
    filename = [options.output, filename].join("\\");
    fs.writeFileSync(filename, body, "utf8");
}

function applyDefaultOptions(opts) {
    return opts;
}

function loadConfiguration() {
    let fn = "yaml-to-docusaurus.json";
    if (fs.existsSync(fn)) {
        config = JSON(fs.readFileSync(fn, "utf8"));
    }
}

function setMissingExtension(basename, extension) {
    let ext = path.extname(basename);
    if (ext.length == 0) {
        return basename.trim() + extension.trim();
    }
    return basename.trim();
}


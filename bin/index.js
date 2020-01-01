#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const YAML = require("yamljs");
const Handlebars = require("handlebars");
const program = require("commander");


program
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
if (program.args.length > 0) {
    loadConfiguration();
    let fn = setMissingExtension(program.args[0], config.extension);
    options = applyDefaultOptions(program.opts());

 
        execute(fn);
}

function execute(outlineFilename) {

    var doc = YAML.parse(fs.readFileSync(outlineFilename, "utf8"));
    var topics = doc.topics;


    if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output);
    }

    generateDocuments(topics);
}

function generateFromTemplate(templateBasename, data) {
    let tfn = setMissingExtension(templateBasename, config.templateExtension);
    tfn = [config.templates, tfn].join("\\");
    let template = Handlebars.compile(fs.readFileSync(tfn, "utf8"));
    return template(data);

}

function generateHeaders(headers, level) {
    let content = "";
    console.log(headers);
    if (headers) {
    headers.forEach(header => {
        content += generateFromTemplate("header-template", {
            "headmark": "#".repeat(level),
            "title": header.title,
            "content": (header.headers) ? generateHeaders(header.headers, level + 1) : ""
        })
    })
}
    return content;
}

function generateDocuments(topics) {
    topics.forEach(topic => {

        let data = {};
        data.slug = getTopicBasename(topic);
        data.title = topic.title;
        data.brief = topic.brief;
        console.log(topic);
        data.content = (topic.headers) ? generateHeaders(topic.headers, 2) : "undefined"

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


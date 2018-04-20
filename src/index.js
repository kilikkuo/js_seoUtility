/*jshint esversion: 6 */
var fs = require('fs');
var assert = require('assert');
var os = require('os');
var SEORule = require('./seorule');
var _ = require('underscore');

function SEOUtility() {
    // Array to store the SEO rule evalution result string
    var results = [];
    // A dictionary to store the layout of html dom tree.
    var htmlTree = {};
    // A dictionary to store the planarized tree information.
    // Key is tag name, value is an array of elements whose name is the same as key.
    var htmlTagPlanarizedMap = {};
    // A variable to identify if the utlity is ready to evaluate or not.
    var ready = false;
    var __objid = 1;

    var rawRules = [];
    rawRules.push.apply(rawRules, SEORule.preDefinedRawRules);

    function clearResults() {
        while (results.length > 0) {
            results.pop();
        }
    }

    function setSourceFile(srcPath) {
        // Clear old results when there's new incoming data.
        clearResults();
        var p = new Promise((resolve, reject) => {
            // Check if file path exists, read it as text and prepare the HTMLSource.
            fs.exists(srcPath, (exists) => {
                if (exists) {
                    var source = fs.readFileSync(srcPath, 'utf8');
                    prepareHTMLSource(source);
                    resolve();
                } else {
                    console.log(`${srcPath} : no such file`);
                    reject();
                }
            });
        });
        return p;
    }

    function setSourceStream(srcStream) {
        assert(srcStream && srcStream.readable, 'Source stream should be readable.');
        // Clear old results when there's new incoming data.
        clearResults();
        return new Promise((resolve, reject) => {
            // Check if srcStream is readable, collect data chunk, and convert it
            // to string, then prepare the HTMLSource.
            var chunks = [];
            srcStream.on('readable', () => {
                // console.log('srcStream event: readable');
                var chunk = srcStream.read();
                if (chunk) {
                    chunks.push(chunk.toString());
                }
            });
            srcStream.on('data', (chunk) => {
                // console.log('srcStream event: data');
                chunks.push(chunk.toString());
            });
            srcStream.on('end', () => {
                // console.log('srcStream event: end');
                var source = chunks.join('');
                prepareHTMLSource(source);
                resolve();
            });
            srcStream.on('error', () => {
                console.log('srcStream event: error');
                reject();
            });
        });
    }
    
    function outputConsole() {
        return new Promise((resolve, reject) => {
            console.log('=== Results ===');
            for (var r of results) {
                console.log(r);
            }
            console.log('===============');
            resolve();
        });
    }

    function outputFile(destPath) {
        return new Promise((resolve, reject) => {
            fs.open(destPath, 'w', (err, fd) => {
                if (err) {
                    console.error(err);
                    reject();
                    return;
                }
                for (var r of results) {
                    fs.appendFileSync(destPath, r);
                    fs.appendFileSync(destPath, os.EOL);
                }
                fs.closeSync(fd);
                resolve();
            });
        });
    }

    function outputStream(destPath) {
        return new Promise((resolve, reject) => {
            var wstream = fs.createWriteStream(destPath);
            for (var r of results) {
                wstream.write(r);
                wstream.write(os.EOL);
            }
            wstream.end();
            resolve(wstream);
        });
    }

    function prepareHTMLSource(source) {
        assert(source !== null && source !== undefined, 'HTML Source should not be null or undefined');
        // Build a tree & map for the use of matching results by specific tag.
        var treeAndMap = buildTreeAndMap(source);
        htmlTree = treeAndMap.tree;
        htmlTagPlanarizedMap = treeAndMap.map;
        ready = true;
    }

    function buildTreeAndMap(s) {
        function extractTagName(ss) {
            // The format of incoming tag could be
            // e.g. <head> or </head> or <title /> or <meta >.
            if (ss.startsWith('</')) {
                var j = ss.indexOf(">");
                return ss.substring(2, j);
            } else {
                ss = ss.replace('>', '');
                var splitted = ss.split(' ')[0];
                return splitted.substring(1, splitted.length);
            }
        }

        // A helper function to mimic the tree node structure.
        function generateChildNode(name, content, parent) {
            var childNode = {};
            childNode.name = name;
            childNode.content = content;
            childNode.parent = parent;
            childNode.id = __objid;
            childNode.children = [];
            __objid += 1;
            return childNode;
        }

        var planeMap = {};
        function addContentToPlaneMap(tag, childNode, parent) {
            // Build a map whose keys are tag name and the value
            // is an array of elements with the same tag name.
            if (!(tag in planeMap)) {
                planeMap[tag] = [];
            }
            planeMap[tag].push(childNode);
        }

        var pointer = generateChildNode('root', '', null);
        var root = pointer;
        var tagContent, j, childNode;
        for (var i=0; i < s.length; i++) {
            var c = s.charAt(i);
            if (c == "<") {
                j = s.indexOf(">", i+1);
                // tagContent contains tag name and attributes.
                tagContent = s.substring(i, j+1).toLowerCase();
                var name = extractTagName(tagContent).toLowerCase();
                if (tagContent.charAt(tagContent.length-2) == "/") {
                    // It's a leaf element
                    childNode = generateChildNode(name, tagContent, pointer);
                    addContentToPlaneMap(name, childNode, pointer);
                    pointer.children.push(childNode);
                } else if (tagContent.charAt(1) != "/") {
                    // It's an open tag
                    childNode = generateChildNode(name, tagContent, pointer);
                    addContentToPlaneMap(name, childNode, pointer);
                    pointer.children.push(childNode);
                    pointer = childNode;
                } else {
                    // It must be a closing tag
                    if (pointer.parent != null && pointer.parent.parent != null) {
                        pointer = pointer.parent;
                    }
                }
                i = j;
            }
        }
        return {'tree': root, 'map': planeMap};
    }

    function findAllMatches(tag) {
        assert(ready, 'Should NOT be called when it\'s not ready');
        var m = [];
        if (tag in htmlTagPlanarizedMap) {
            return htmlTagPlanarizedMap[tag];
        }
        return m;
    }

    function prepareSEORules(seletecRawRules) {
        // Preapre SEORule from selected raw rules
        var seoRules = [];
        for (let rawRule of seletecRawRules) {
            var rule = SEORule.createSEORulesByType(self, rawRule);
            seoRules.push(rule);
        }
        return seoRules;
    }

    // The default value of ruleIndices map to pre-defined seo rules.
    function evaluteSEORules(ruleIndices=[0,1,2,3,4,5,6]) {
        // Clear out the old results since we're going to evaluate new rules.
        clearResults();
        var p = new Promise((resolve, reject) => {
            // Collect rules which the user wants to check, the rule and its corresponding index
            // can be displayed by calling getCurrentSEORuleIndices() to list all existing rules first.
            var selectedRawRules = [];
            var selectedIndices = [];
            for (var idx of ruleIndices) {
                selectedRawRules.push(rawRules[idx]);
                selectedIndices.push(idx);
            }
            console.log(`Selected SEORule indices : ${selectedIndices}`);
            // Evalute all selected rules.
            var preparedRules = prepareSEORules(selectedRawRules);
            console.log('Evaluating ...');
            for (var rule of preparedRules) {
                var result = rule.evalutate();
                results.push(result);
            }
            resolve();
        });
        return p;
    }

    function getCurrentSEORuleIndices() {
        // List all existing rules.
        console.log('=== Current SEO Rules ===');
        for (var r in rawRules) {
            var msg = SEORule.translateRuleToMsg(rawRules[r]);
            console.log(`Rule Index : ${r} => ${msg}`);
        }
        console.log('=========================');
        var indices = [...Array(rawRules.length).keys()];
        return indices;
    }

    // This is only for validation usage.
    function getCurrentRawRules() {
        return rawRules.slice();
    }

    function isString(v) {
        if (typeof v === 'string' || v instanceof String) {
            return true;
        }
        return false;
    }

    function isNumber(v) {
        if (typeof v === 'number' || v instanceof Number) {
            return true;
        }
        return false;
    }

    function isRuleContained(rule) {
        for (var i = 0; i < rawRules.length; i++) {
            if (_.isEqual(rawRules[i], rule)) {
                return true;
            }
        }
        return false;
    }

    function addRuleCheckTagWithAttr(tag, attr) {
        if (isString(tag) && isString(attr) && tag !== '' && attr !== '') {
            var rule = SEORule.createRawRuleByTagAttr(tag, attr);
            // There should not be duplicate rule.
            if (!isRuleContained(rule)) {
                rawRules.push(rule);
                return true;
            }
        }
        return false;
    }

    function addRuleCheckTagWithChildTag(tag, childTag) {
        if (isString(tag) && isString(childTag) && tag !== '' && childTag !== '') {
            var rule = SEORule.createRawRuleByTagChildTag(tag, childTag);
            // There should not be duplicate rule.
            if (!isRuleContained(rule)) {
                rawRules.push(rule);
                return true;
            }
        }
        return false;
    }

    function addRuleCheckTagWithChildTagAttrVal(tag, childTag, childAttr, childVal) {
        if (isString(tag) && isString(childTag) && isString(childAttr) && isString(childAttr) &&
            tag !== '' && childTag !== '' && childAttr !== '' && childVal !== '') {
            var rule = SEORule.createRawRuleByTagChildTagAttrVal(tag, childTag, childAttr, childVal);
            // There should not be duplicate rule.
            if (!isRuleContained(rule)) {
                rawRules.push(rule);
                return true;
            }
        }
        return false;
    }

    function addRuleCheckTagAmount(tag, amount) {
        if (isString(tag) && isNumber(amount) && tag !== '' && amount >= 0) {
            // There should not be duplicate rule.
            var rule = SEORule.createRawRuleByTagAmount(tag, amount);
            if (!isRuleContained(rule)) {
                rawRules.push(rule);
                return true;
            }
        }
        return false;
    }

    function isReadyToEvalute() {
        return ready;
    }

    var self = {
        'setSourceFile' :    setSourceFile,
        'setSourceStream' :  setSourceStream,
        'findAllMatches' :   findAllMatches,
        'getCurrentSEORuleIndices' :  getCurrentSEORuleIndices,
        'addRuleCheckTagWithAttr': addRuleCheckTagWithAttr,
        'addRuleCheckTagWithChildTag': addRuleCheckTagWithChildTag,
        'addRuleCheckTagWithChildTagAttrVal': addRuleCheckTagWithChildTagAttrVal,
        'addRuleCheckTagAmount': addRuleCheckTagAmount,
        'evaluteSEORules' :  evaluteSEORules,
        'outputConsole' :   outputConsole,
        'outputFile' :      outputFile,
        'outputStream' :    outputStream,
        'isReadyToEvalute' : isReadyToEvalute,
        'getCurrentRawRules' : getCurrentRawRules
    };
    return self;
}

module.exports = {
    'SEOUtility' : SEOUtility,
    'PreDefinedRawRules' : SEORule.preDefinedRawRules
};

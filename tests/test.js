'use strict';

const fs = require('fs');
const assert = require('assert');
const SEOUtility = require('./../src/index.js');
const _ = require('underscore');

var seo = new SEOUtility.SEOUtility();

function checkAddRules() {
    // Check Add new rule & do not add duplicated rule.
    var res1 = seo.addRuleCheckTagWithAttr('link', 'href');
    assert(res1, '[TEST] res1 - The rule should be added!');
    var res2 = seo.addRuleCheckTagWithAttr('link', 'href');
    assert(res2 == false, '[TEST] res2 - The rule should not be added!');
    var res3 = seo.addRuleCheckTagWithChildTag('head', 'base');
    assert(res3, '[TEST] res3 - The rule should be added!');
    var res4 = seo.addRuleCheckTagWithChildTag('head', 'base');
    assert(!res4, '[TEST] res4 - The rule should not be added!');
    var res5 = seo.addRuleCheckTagWithChildTagAttrVal('head', 'meta', 'name', 'viewport');
    assert(res5, '[TEST] res5 - The rule should be added!');
    var res6 = seo.addRuleCheckTagWithChildTagAttrVal('head', 'meta', 'name', 'viewport');
    assert(!res6, '[TEST] res6 - The rule should be not added!');
    var res7 = seo.addRuleCheckTagAmount('H2', 1);
    assert(res7, '[TEST] res7 - The rule should be added!');
    var res8 = seo.addRuleCheckTagAmount('H2', 1);
    assert(!res8, '[TEST] res8 - The rule should not be added!');

    var currentRawRules = seo.getCurrentRawRules();
    var defaultRules = SEOUtility.PreDefinedRawRules;
    var newAddedRules = [{'tag' : 'link',
                          'attr' : 'href'},
                         {'tag' : 'head',
                          'childtag': 'base'},
                         {'tag' : 'head',
                          'childtag' : 'meta',
                          'childattr' : 'name',
                          'childval' : 'viewport'},
                         {'tag' : 'h2',
                          'count' : 1}]
    defaultRules.push.apply(defaultRules, newAddedRules);
    assert(_.isEqual(currentRawRules, defaultRules), '[TEST] checkAddRules failed');
}

// Check if the output file/stream is the same as our validation file
function checkOutputFile(testFile, validationFile) {
    var testBuf = fs.readFileSync(testFile);
    var validationBuf = fs.readFileSync(validationFile);

    var lengthTest = testBuf.length;
    var lengthValidation = validationBuf.length;
    assert(lengthTest == lengthValidation, `[TEST] The length of ${testFile} does not match the lenght of ${validationFile}.`);
    var index = 0;
    var match = true;
    while (index < lengthTest) {
        if (testBuf[index] === validationBuf[index]) {
            index++;
        } else {
            match = false;
            break;
        }
    }
    assert(match, `[TEST] The file ${testFile} does not match ${validationFile}.`);
}

checkAddRules();

// Check if current rule indices (after addin new rules) is the same as expected.
var seoRuleIndices = seo.getCurrentSEORuleIndices();
assert(_.isEqual(seoRuleIndices, [0,1,2,3,4,5,6,7,8,9,10]));

// The flow of test1
// 1. setSourceFile(filepath)
// 2. evaluteSEORules(indices)
// 3. outputConsole() or outputFile(filepath)
seo.setSourceFile('./tests/index.html').then(() => {
    assert(seo.isReadyToEvalute(), '[TEST] SEOUtility should be in ready state.');
    seo.evaluteSEORules(seoRuleIndices).then(() => {
        seo.outputConsole();
        seo.outputFile('./tests/file.txt').then(() => {
            checkOutputFile('./tests/file.txt', './tests/file_validation.txt');
        }, () => {
            assert(false, '[TEST] Failed to output file.');
        });
    }, () => {
        assert(false, '[TEST] Falied to evaluate seo rules.');
    });
}, () => {
    assert(false, '[TEST] Falied to set html source file.');
});

// The flow of test2
// 1. setSourceStream(filepath)
// 2. evaluteSEORules(indices)
// 3. outputStream(filepath)
var rs = fs.createReadStream('./tests/index_stream.txt');
seo.setSourceStream(rs).then(() => {
    assert(seo.isReadyToEvalute(), '[TEST] SEOUtility should be in ready state.');
    seo.evaluteSEORules(seoRuleIndices).then(() => {
        seo.outputStream('./tests/stream.txt').then((ws) => {
            ws.on('finish', function () {
                console.log('[TEST] Writable stream has been written');
                checkOutputFile('./tests/stream.txt', './tests/stream_validation.txt');
            });
        }, () => {
            assert(false, '[TEST] Failed to output stream.');
        });
    }, () => {
        assert(false, '[TEST] Falied to evaluate seo rules.');
    });
}, () => {
    assert(false, '[TEST] Falied to set html source stream.');
});
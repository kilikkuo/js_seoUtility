# API for seoutility
For more information, run npm test to check the results.
Or setting npm link for another project to test this module.

Creation

``` javascript
const SEOUtility = require('seoutility');
var seo = new SEOUtility.SEOUtility();
```

Usage

1) By calling the following functions, user can add their own SEO rules to check if the tag/attr/value existence.
* addRuleCheckTagWithAttr
* addRuleCheckTagWithChildTag
* addRuleCheckTagWithChildTagAttrVal
* addRuleCheckTagAmount

``` javascript
seo.addRuleCheckTagWithAttr('link', 'href');
seo.addRuleCheckTagWithChildTag('head', 'base');
seo.addRuleCheckTagWithChildTagAttrVal('head', 'meta', 'name', 'viewport');
seo.addRuleCheckTagAmount('H2', 1);
```

2) Source information related

* setSourceFile: Set a file which indicates a HTML file. Returning a promise.
* setSourceStream: Set a stream file which indicates a readable stream. Returning a promise.

``` javascript
seo.setSourceFile('./tests/index.html').then(() => {
}, () => {
    assert(false, '[TEST] Falied to set html source file.');
});

var rs = fs.createReadStream('./tests/index_stream.txt');
seo.setSourceStream(rs).then(() => {
}, () => {
    assert(false, '[TEST] Falied to set html source stream.');
});
```

* isReadyToEvalute: Check if the utility is ready for SEO rules evaluation.

* getCurrentSEORuleIndices: Get the SEO rule indices (array) and print human readable messages in console, so that user is able to select target rules to proceed evaluation.

``` javascript
var seoRuleIndices = seo.getCurrentSEORuleIndices();
assert(_.isEqual(seoRuleIndices, [0,1,2,3,4,5,6,7,8,9,10]));
```

3) Evaluation
* evaluteSEORules: Evaluate SEO rules by input indices. Returning a promise.

``` javascript
seo.evaluteSEORules([0,2,3,4]).then(() => {
    console.log('OK');
}, () => {
    console.log('NG');
});
```

4) Output
* outputConsole: Print out the evaluation results in console.

* outputFile: By specifiy the destination file path, the evalution results will be dump to that file. Returning a promise.

* outputStream: By specifiy the destination stream path, the evalution results will be dump to that stream file. Returning a promise.

``` javascript
seo.outputConsole();
seo.outputFile('./tests/file.txt').then(() => {
    checkOutputFile('./tests/file.txt', './tests/file_validation.txt');
}, () => {
    assert(false, '[TEST] Failed to output file.');
});
seo.outputStream('./tests/stream.txt').then((ws) => {
    ws.on('finish', function () {
        console.log('[TEST] Writable stream has been written');
        checkOutputFile('./tests/stream.txt', './tests/stream_validation.txt');
    });
}, () => {
    assert(false, '[TEST] Failed to output stream.');
});
```
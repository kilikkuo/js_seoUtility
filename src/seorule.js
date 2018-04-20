/*jshint esversion: 6 */
var assert = require('assert');
var util = require("util");

let preDefinedRawRules = [{'tag'     : 'img',
                             'attr'    : 'alt'},
                            {'tag'     : 'a',
                             'attr'    : 'rel'},
                            {'tag'     : 'head',
                             'childtag'  : 'title'},
                            {'tag'     : 'head',
                             'childtag'  : 'meta',
                             'childattr' : 'name',
                             'childval'  : 'descriptions'},
                            {'tag'     : 'head',
                             'childtag'  : 'meta',
                             'childattr' : 'name',
                             'childval'  : 'keywords'},
                            {'tag'     : 'strong',
                             'count'   : 15},
                            {'tag'     : 'h1',
                             'count'   : 1}];

// Base class for a SEO rule.
class SEOBaseRule {
    constructor(seo, param) {
        this.seo = seo;
        assert('tag' in param, 'Target tag should be contained in parameters');
        this.mainTag = param.tag;
        this.numOfExists = 0;
    }

    evalutate() {
        assert(false, 'Should be implemented by derived class.');
        return 'unknonw';
    }
}

// Check if a tag has certain attribute or not.
class WithoutAttrRule extends SEOBaseRule {
    constructor(seo, param) {
        super(seo, param);
        assert('attr' in param, 'Target attribute should be contained in parameters');
        this.mainAttr = param.attr;
    }

    evalutate() {
        var matchedTags = this.seo.findAllMatches(this.mainTag);
        for (let m of matchedTags) {
            if (m && m.content.includes(this.mainAttr)) {
                this.numOfExists += 1;
            }
        }
        var numOfTags = matchedTags != null ? matchedTags.length : 0;
        var res = `Total number of <${this.mainTag}> tag : ${numOfTags} ==> ${this.numOfExists} of them with attribute : ${this.mainAttr}.`;
        return res;
    }
}

// Check if a tag has certain child tag or not.
class ChildTagExistRule extends SEOBaseRule {
    constructor(seo, param) {
        super(seo, param);
        assert('childtag' in param, 'Target child tag should be contained in parameters.');
        this.childTag = param.childtag;
    }

    evalutate() {
        var matchedTags = this.seo.findAllMatches(this.childTag);
        for (let m of matchedTags) {
            // Check if the child tag's parent is what we want or not.
            if (m.parent && m.parent.name == this.mainTag) {
                this.numOfExists += 1;
            }
        }
        var numOfTags = matchedTags != null ? matchedTags.length : 0;
        var res = `In <${this.mainTag}>, there are ${this.numOfExists} child tag <${this.childTag}>.`;
        return res;
    }
}

// Check if a tag has certain child tag with specific attribute and value or not.
class ChildTagAttrValExistRule extends SEOBaseRule {
    constructor(seo, param) {
        super(seo, param);
        assert('childtag' in param, 'Target child tag should be contained in parameters.');
        assert('childattr' in param, 'Target child tag attribute should be contained in parameters.');
        assert('childval' in param, 'Target child tag value should be contained in parameters.');
        this.childTag = param.childtag;
        this.childTagAttr = param.childattr;
        this.childTagVal = param.childval;
        this.target1 = this.childTagAttr + '="' + this.childTagVal + '"';
        this.target2 = this.childTagAttr + '=\'' + this.childTagVal + '\'';
    }

    evalutate() {
        var matchedTags = this.seo.findAllMatches(this.childTag);
        for (let m of matchedTags) {
            // Check if the child tag's parent is what we want or not.
            if (m.parent && m.parent.name == this.mainTag) {
                if (m.content.includes(this.target1) || m.content.includes(this.target2)) {
                    this.numOfExists += 1;
                }
            }
        }
        var numOfTags = matchedTags != null ? matchedTags.length : 0;
        var res = `In <${this.mainTag}>, there are ${this.numOfExists} child tag <${this.childTag}> with attribute-value : ${this.target1}.`;
        return res;
    }
}

// Check if the amount of the tag is more or less than specific amount.
class TagCountRule extends SEOBaseRule {
    constructor(seo, param) {
        super(seo, param);
        assert('count' in param, 'Target count should be contained in parameters');
        this.critiria = param.count;
    }

    evalutate() {
        var matchedTags = this.seo.findAllMatches(this.mainTag);
        var numOfTags = matchedTags != null ? matchedTags.length : 0;
        var lessOrMore = numOfTags >= this.critiria ? 'more than or equal to' : 'less than';
        var res = `In this HTML, there are ${numOfTags} (${lessOrMore} ${this.critiria}) <${this.mainTag}>.`;
        return res;
    }
}

// Define rule type
const TYPE_BASIC = 0;
const TYPE_ATTR_EXIST = 1;
const TYPE_CHILDTAG_EXIST = 2;
const TYPE_CHILDTAG_ATTR_VAL =3;
const TYPE_TAG_COUNT = 4;

function translateRuleToMsg(rule) {
    // Translate the raw seo rules (dictionary object) to human readable message.
    var msg = '';
    if ('childattr' in rule) {
        msg = `In <${rule.tag}>, check if <${rule.childtag}> has '${rule.childattr}=${rule.childval}'.`;
    } else if ('childtag' in rule) {
        msg = `In <${rule.tag}>, check if there is '<${rule.childtag}>'.`;
    } else if ('attr' in rule) {
        msg = `Check if <${rule.tag}> has attribute '${rule.attr}'.`;
    } else if ('count' in rule) {
        msg = `Check if there is more than ${rule.count} <${rule.tag}> tag in this HTML.`;
    }
    return msg;
}

function getRuleTypeByParam(param) {
    // Return SEO rule type by looking into the key inside param.
    if ('childtag' in param) {
        if ('childattr' in param) {
            return TYPE_CHILDTAG_ATTR_VAL;
        }
        return TYPE_CHILDTAG_EXIST;
    } else if ('count' in param) {
        return TYPE_TAG_COUNT;
    } else if ('attr' in param) {
        return TYPE_ATTR_EXIST;
    }
    return TYPE_BASIC;
}

function createSEORulesByType(seo, param) {
    // Create specific SEO rule according to the type.
    var type = getRuleTypeByParam(param);
    switch (type) {
        case TYPE_ATTR_EXIST:
            return new WithoutAttrRule(seo, param);
        case TYPE_CHILDTAG_EXIST:
            return new ChildTagExistRule(seo, param);
        case TYPE_CHILDTAG_ATTR_VAL:
            return new ChildTagAttrValExistRule(seo, param);
        case TYPE_TAG_COUNT:
            return new TagCountRule(seo, param);
        case TYPE_BASIC:
            return new SEOBaseRule(seo, param);
        default:
            return new SEOBaseRule(seo, param);
    }
}

function createRawRuleByTagAttr(tag, attr) {
    var rule = {'tag' : tag.toLowerCase(),
                'attr' : attr.toLowerCase()};
    return rule;
}

function createRawRuleByTagChildTag(tag, childTag) {
    var rule = {'tag' : tag.toLowerCase(),
                'childtag' : childTag.toLowerCase()};
    return rule;
}

function createRawRuleByTagChildTagAttrVal(tag, childTag, childAttr, childVal) {
    var rule = {'tag' : tag.toLowerCase(),
                'childtag' : childTag.toLowerCase(),
                'childattr' : childAttr.toLowerCase(),
                'childval' : childVal.toLowerCase()};
    return rule;
}

function createRawRuleByTagAmount(tag, amount) {
    var rule = {'tag' : tag.toLowerCase(),
                'count' : amount};
    return rule;
}

module.exports = {
    'createSEORulesByType' : createSEORulesByType,
    'translateRuleToMsg' : translateRuleToMsg,
    'preDefinedRawRules' : preDefinedRawRules,
    'createRawRuleByTagAttr' : createRawRuleByTagAttr,
    'createRawRuleByTagChildTag' : createRawRuleByTagChildTag,
    'createRawRuleByTagChildTagAttrVal' : createRawRuleByTagChildTagAttrVal,
    'createRawRuleByTagAmount' : createRawRuleByTagAmount
};